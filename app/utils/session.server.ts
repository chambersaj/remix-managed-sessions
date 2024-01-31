import {
	createCookieSessionStorage,
	createSessionStorage,
} from '@remix-run/node'
import { prisma } from '#app/utils/db.server.ts'
import { getSessionExpirationDate } from './auth.server.ts'

function createDatabaseSessionStorage({
	cookieOptions,
}: {
	cookieOptions: any
}) {
	return createSessionStorage({
		cookie: cookieOptions,
		async createData(data, expires) {
			if (expires === undefined) {
				expires = getSessionExpirationDate()
			}

			if (data.userId) {
				const id = await prisma.session.create({
					select: { id: true },
					data: { userId: data.userId, expirationDate: expires },
				})
				return id.id
			} else {
				throw new Error('userId is required to create session')
			}
		},
		async readData(id) {
			const session = await prisma.session.findUnique({
				select: { id: true, userId: true },
				where: { id },
			})
			if (!session) {
				return { invalidSession: true }
			}
			return session
		},
		async updateData(id, data, expires) {
			if (expires === undefined) {
				expires = getSessionExpirationDate()
			}

			await prisma.session.update({
				select: { id: true, userId: true },
				where: { id },
				data: { expirationDate: expires },
			})
		},
		async deleteData(id) {
			//delete the session, if it has already been removed then ignore the error.
			prisma.session.delete({ where: { id } }).catch(() => {})
		},
	})
}

export const { getSession, destroySession, commitSession } =
	createDatabaseSessionStorage({
		cookieOptions: {
			name: 'en_session',
			sameSite: 'lax',
			path: '/',
			httpOnly: true,
			secrets: process.env.SESSION_SECRET.split(','),
			secure: process.env.NODE_ENV === 'production',
		},
	})

export const sessionStorage = createCookieSessionStorage({
	cookie: {
		name: 'en_session',
		sameSite: 'lax',
		path: '/',
		httpOnly: true,
		secrets: process.env.SESSION_SECRET.split(','),
		secure: process.env.NODE_ENV === 'production',
	},
})
