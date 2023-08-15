import { FastifyReply, FastifyRequest } from 'fastify'

export async function validateUserSession(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { userSession } = request.cookies

  if (!userSession) {
    return reply.status(401).send({
      error: 'Unauthorized.',
    })
  }
}
