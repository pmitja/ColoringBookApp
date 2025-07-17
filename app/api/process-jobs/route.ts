import { prisma } from '@/lib/db'
import { fal } from '@fal-ai/client'
import { NextRequest, NextResponse } from 'next/server'

// Configure FAL.AI (will be undefined if not set)
if (process.env.FAL_API_KEY) {
  fal.config({
    credentials: process.env.FAL_API_KEY,
  })
}

export async function GET(request: NextRequest) {
  try {
    // Check if FAL API key is configured
    if (!process.env.FAL_API_KEY) {
      return NextResponse.json(
        { error: 'FAL_API_KEY not configured' },
        { status: 500 }
      )
    }

    // Find all QUEUED jobs
    const jobs = await prisma.imageJob.findMany({
      where: { status: 'QUEUED' },
      take: 3, // Limit to avoid overloading
    })

    if (!jobs.length) {
      return NextResponse.json({ message: 'No queued jobs found.' })
    }

    const results: Array<{ jobId: string; status: string; error?: string }> = []

    for (const job of jobs) {
      try {
        // Mark job as processing
        await prisma.imageJob.update({
          where: { id: job.id },
          data: { status: 'PROCESSING' },
        })

        // Since we don't store original images, we can't process them in the background
        // This endpoint is now mainly for manual triggering of jobs that were created
        // with the old flow or for future batch processing
        
        await prisma.imageJob.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            errorMessage: 'Original image not available for processing. Please upload again.',
          },
        })
        
        results.push({ jobId: job.id, status: 'FAILED', error: 'Original image not available' })
      } catch (err: any) {
        await prisma.imageJob.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            errorMessage: err?.message || 'Unknown error',
          },
        })
        results.push({ jobId: job.id, status: 'FAILED', error: err?.message })
      }
    }

    return NextResponse.json({ processed: results })
  } catch (error) {
    console.error('Processing error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if FAL API key is configured
    if (!process.env.FAL_API_KEY) {
      return NextResponse.json(
        { error: 'FAL_API_KEY not configured' },
        { status: 500 }
      )
    }

    // Find all QUEUED jobs
    const jobs = await prisma.imageJob.findMany({
      where: { status: 'QUEUED' },
      take: 3, // Limit to avoid overloading
    })

    if (!jobs.length) {
      return NextResponse.json({ message: 'No queued jobs.' })
    }

    const results: Array<{ jobId: string; status: string; error?: string }> = []

    for (const job of jobs) {
      try {
        // Mark job as processing
        await prisma.imageJob.update({
          where: { id: job.id },
          data: { status: 'PROCESSING' },
        })

        // Since we don't store original images, we can't process them in the background
        // This endpoint is now mainly for manual triggering of jobs that were created
        // with the old flow or for future batch processing
        
        await prisma.imageJob.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            errorMessage: 'Original image not available for processing. Please upload again.',
          },
        })
        
        results.push({ jobId: job.id, status: 'FAILED', error: 'Original image not available' })
      } catch (err: any) {
        await prisma.imageJob.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            errorMessage: err?.message || 'Unknown error',
          },
        })
        results.push({ jobId: job.id, status: 'FAILED', error: err?.message })
      }
    }

    return NextResponse.json({ processed: results })
  } catch (error) {
    console.error('Processing error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 