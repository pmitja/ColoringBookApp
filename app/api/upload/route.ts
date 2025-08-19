import { BASE_STYLES, FACE_ADDONS, INTO_LINEART } from '@/config/prompts'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { fal } from '@fal-ai/client'
import { NextRequest, NextResponse } from 'next/server'

// Configure FAL.AI
if (process.env.FAL_API_KEY) {
  fal.config({
    credentials: process.env.FAL_API_KEY,
  })
}

// Function to process a single job
async function processJob(jobId: string, originalImageBuffer: Buffer, fileType: string, style: keyof typeof BASE_STYLES, addons: (keyof typeof FACE_ADDONS)[]) {
  try {
    // Get the job
    const job = await prisma.imageJob.findUnique({
      where: { id: jobId }
    })

    if (!job || job.status !== 'QUEUED') {
      return
    }

    // Mark job as processing
    await prisma.imageJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' },
    })

    // Convert buffer to base64 for FAL.AI
    const base64Image = originalImageBuffer.toString('base64')
    const dataUrl = `data:${fileType};base64,${base64Image}`

    // Build the prompt with selected style and addons
    let stylePrompt = BASE_STYLES[style]
    if (addons.length > 0) {
      const addonPrompts = addons.map(addon => FACE_ADDONS[addon]).join(' ')
      stylePrompt = `${stylePrompt} ${addonPrompts}`
    }

    // 1. Call FAL.AI for style transformation using the original image
    const styledResult = await fal.subscribe('fal-ai/flux-kontext/dev', {
      input: {
        prompt: stylePrompt,
        image_url: dataUrl,
      } as any,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          console.log('Style generation progress:', update.logs?.map((log) => log.message).join('\n'))
        }
      },
    })
    
    const styledImageUrl = styledResult.data?.images?.[0]?.url
    if (!styledImageUrl) throw new Error('No styled image returned from FAL.AI')

    // 2. Call FAL.AI for lineart using the styled image as base
    const lineartResult = await fal.subscribe('fal-ai/flux-kontext/dev', {
      input: {
        prompt: INTO_LINEART,
        image_url: styledImageUrl,
      } as any,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          console.log('Lineart generation progress:', update.logs?.map((log) => log.message).join('\n'))
        }
      },
    })
    
    const lineartImageUrl = lineartResult.data?.images?.[0]?.url
    if (!lineartImageUrl) throw new Error('No lineart image returned from FAL.AI')

    // 3. Upload both styled and lineart images to UploadThing for permanent storage
    const styledUrl = await fetchAndUploadToUploadThing(styledImageUrl, `styled-${jobId}.jpg`)
    if (!styledUrl) throw new Error('Failed to upload styled image to UploadThing')

    const lineartUrl = await fetchAndUploadToUploadThing(lineartImageUrl, `lineart-${jobId}.jpg`)
    if (!lineartUrl) throw new Error('Failed to upload lineart image to UploadThing')

    // 4. Update job in DB with final results (no original image stored)
    await prisma.imageJob.update({
      where: { id: jobId },
      data: {
        status: 'DONE',
        inputUrl: null, // No original image URL stored
        cartoonUrl: styledUrl,
        lineartUrl: lineartUrl,
        errorMessage: null,
      },
    })

    console.log(`Job ${jobId} completed successfully`)
  } catch (error) {
    console.error(`Error processing job ${jobId}:`, error)
    await prisma.imageJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
}

async function fetchAndUploadToUploadThing(imageUrl: string, filename: string): Promise<string | null> {
  try {
    // Import UTApi and sharp only when needed
    const { UTApi } = await import('uploadthing/server')
    const sharp = await import('sharp')
    
    const utapi = new UTApi()

    // 1. Fetch the image from FAL.AI
    const response = await fetch(imageUrl)
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`)
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 2. Optimize with sharp (optional, but recommended)
    const processedBuffer = await sharp.default(buffer)
      .resize({ width: 1200, height: 1200, fit: 'inside' })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer()

    // 3. Convert to File
    const file = new File([processedBuffer], filename, { type: 'image/jpeg' })

    // 4. Upload to UploadThing
    const uploadRes = await utapi.uploadFiles(file)
    if (uploadRes.error) throw new Error(uploadRes.error.message)
    return uploadRes.data.url
  } catch (err) {
    console.error('Error uploading to UploadThing:', err)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser()
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id }
    })
    
    if (!dbUser) {
      console.error('User not found in database:', user.id)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if FAL API key is configured
    if (!process.env.FAL_API_KEY) {
      return NextResponse.json(
        { error: 'FAL_API_KEY not configured' },
        { status: 500 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('image') as File
    const style = formData.get('style') as string || 'INTO_PIXAR'
    const addonsString = formData.get('addons') as string || '[]'

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 })
    }

    // Validate style
    if (!BASE_STYLES[style as keyof typeof BASE_STYLES]) {
      return NextResponse.json({ error: 'Invalid style selected' }, { status: 400 })
    }

    // Parse and validate addons
    let addons: (keyof typeof FACE_ADDONS)[] = []
    try {
      addons = JSON.parse(addonsString)
      // Validate each addon
      for (const addon of addons) {
        if (!FACE_ADDONS[addon]) {
          return NextResponse.json({ error: `Invalid addon: ${addon}` }, { status: 400 })
        }
      }
    } catch {
      return NextResponse.json({ error: 'Invalid addons format' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid file type. Please upload an image.' }, { status: 400 })
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 })
    }

    // Convert file to buffer for processing
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Create job in database without storing original image URL
    const job = await prisma.imageJob.create({
      data: {
        userId: user.id,
        inputFileName: file.name,
        inputUrl: null, // No original image URL stored
        status: 'QUEUED',
      },
    })

    // Start processing the job immediately in the background
    process.nextTick(() => {
      processJob(job.id, buffer, file.type, style as keyof typeof BASE_STYLES, addons)
    })

    // Return job ID immediately for redirect to processing page
    return NextResponse.json({ 
      jobId: job.id,
      message: 'Job created successfully. Processing will begin shortly.'
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 