import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { bookSchema } from "@/lib/validations/user"

export const GET = auth(async (req) => {
  if (!req.auth?.user?.id) return new Response('Unauthorized', { status: 401 })
  const userId = req.auth.user.id
  try {
    const books = await prisma.book.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, updatedAt: true, createdAt: true },
    })
    return Response.json(books)
  } catch {
    return new Response('Internal Server Error', { status: 500 })
  }
})

export const POST = auth(async (req) => {
  if (!req.auth?.user?.id) return new Response('Unauthorized', { status: 401 })
  const userId = req.auth.user.id
  try {
    const json = await req.json()
    const parsed = bookSchema.parse(json)
    const created = await prisma.book.create({
      data: { userId, title: parsed.title, data: parsed.data },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    })
    return Response.json(created)
  } catch (err) {
    return new Response('Bad Request', { status: 400 })
  }
})


