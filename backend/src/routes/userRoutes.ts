import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { decode, sign, verify } from 'hono/jwt'
import { signinInput, signupInput } from "@arujgarg/posthub-common";

export const userRouter = new Hono<{
    Bindings: {
        DATABASE_URL: string
        JWT_SECRET: string
    }
}>();

userRouter.post('/signup', async (c) => {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate())
  
  const body = await c.req.json();
  const {success} = signupInput.safeParse(body);
  if(!success){
    c.status(411);
    return c.json({
      message: "wrong inputs"
    })
  }
  
  //add zod validation, hash the password.
  try {
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        username: body.username,
        password: body.password
      }
    })
    const jwt = await sign({
      id: user.id,
      email: user.email
    }, c.env.JWT_SECRET)

    return c.text(jwt)

  } catch (error) {
    c.status(411);
    console.log(error)
    return c.text("could not sign up")
  }
})
  
userRouter.post('/signin', async (c) => {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate())
  const body = await c.req.json();
  const { success } = signinInput.safeParse(body);
  if(!success){
    c.status(411);
    return c.json({
      message: "wrong inputs"
    })
  }
  
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{
          username: body.username,
          password: body.password
        }, {
          email: body.email,
          password: body.password
        }]
      }
    })

    if(!user){
      c.status(403); //unauthorized status code
      return c.text("incorrect credentials");
    }
    const jwt = await sign({
      id: user.id,
      email: user.email
    }, c.env.JWT_SECRET)

    return c.text(jwt);

  } catch (error) {
    c.status(411);
    return c.text("error while signing in");
  }
})



userRouter.get('/search', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
}).$extends(withAccelerate())

  const query = c.req.query('query') || ""
  if(!query) return c.json([]);

  const users = await prisma.user.findMany({
    where: {
      OR: [
        {
          username: {
            startsWith: query,
            mode: "insensitive"
          }
        },
        {
          name: {
            startsWith: query,
            mode: "insensitive"
          }
        }
      ]
    },
    select: {
      profilePic: true,
      username: true,
      name: true
    },
    take: 10,
    skip: 0
  })
  console.log("users", users);

  return c.json(users);


})