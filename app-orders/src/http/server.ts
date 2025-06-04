import '@opentelemetry/auto-instrumentations-node/register'

import fastifyCors from "@fastify/cors";
import { randomUUID } from "crypto";
import fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../db/client.ts";
import { schema } from "../db/schema/index.ts";
import { dispatchOrderCreated } from "../broker/messages/order-created.ts";
import {trace} from "@opentelemetry/api";

const app = fastify().withTypeProvider<ZodTypeProvider>()

app.setSerializerCompiler(serializerCompiler);
app.setValidatorCompiler(validatorCompiler);

app.register(fastifyCors, { origin: "*" });

app.get("/health", () => {
  return "OK ";
});

app.post(
  "/orders",
  {
    schema: {
      body: z.object({
        amount: z.coerce.number(),
      }),
    },
  },
  async (request, reply) => {
    const { amount } = request.body;

    console.log("creating an order with amount ", amount)

    const orderId = randomUUID()

    const newOrder = {
      id: orderId,
      customerId: "05e45faf-f6b3-4def-987e-a338b51f11c4",
      amount,
    }

    await db.insert(schema.orders).values(newOrder)
    trace.getActiveSpan()?.setAttribute('order_id', orderId)

    // const span = tracer.startSpan('eu acho que aqui ta dando merda')
    //
    // span.setAttribute('teste', 'Hello World')
    //

    // await setTimeout(2000)

    dispatchOrderCreated({
      orderId,
      amount,
      customer: {
        id: newOrder.customerId,
      }
    })

    return reply.status(201).send()
  }
);

app.listen({ host: "0.0.0.0", port: 3333 }).then(() => {
  console.log("[Orders] HTTP Server running!");
});
