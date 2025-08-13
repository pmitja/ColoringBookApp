import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { bookSchema } from "@/lib/validations/user"

export const GET = auth(async (req, { params }) => {
  if (!req.auth?.user?.id) return new Response('Unauthorized', { status: 401 })
  const userId = req.auth.user.id
  const { id } = params as { id: string }
  try {
    const book = await prisma.book.findFirst({ where: { id, userId } })
    if (!book) return new Response('Not Found', { status: 404 })
    return Response.json(book)
  } catch {
    return new Response('Internal Server Error', { status: 500 })
  }
})

export const PUT = auth(async (req, { params }) => {
  if (!req.auth?.user?.id) return new Response('Unauthorized', { status: 401 })
  const userId = req.auth.user.id
  const { id } = params as { id: string }
  try {
    const json = await req.json()
    const parsed = bookSchema.partial().parse(json)
    const updated = await prisma.book.update({
      where: { id },
      data: {
        // Guard ownership via nested condition
        ...(await prisma.book.findFirst({ where: { id, userId } }))
          ? { title: parsed.title, data: parsed.data }
          : (() => {
              throw new Error('Forbidden')
            })(),
      },
      select: { id: true, title: true, updatedAt: true },
    })
    return Response.json(updated)
  } catch (e: any) {
    if (e?.message === 'Forbidden') return new Response('Forbidden', { status: 403 })
    return new Response('Bad Request', { status: 400 })
  }
})

export const DELETE = auth(async (req, { params }) => {
  if (!req.auth?.user?.id) return new Response('Unauthorized', { status: 401 })
  const userId = req.auth.user.id
  const { id } = params as { id: string }
  try {
    const book = await prisma.book.findFirst({ where: { id, userId } })
    if (!book) return new Response('Not Found', { status: 404 })
    await prisma.book.delete({ where: { id } })
    return new Response('OK')
  } catch {
    return new Response('Internal Server Error', { status: 500 })
  }
})


