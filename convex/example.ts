import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

export const postMessage = httpAction(async (ctx, request) => {
  // const { author, body } = await request.json();

  // await ctx.runMutation(internal.messages.sendOne, {
  //   body: `Sent via HTTP action: ${body}`,
  //   author,
  // });

  return new Response(null, {
    status: 200,
  });
});
