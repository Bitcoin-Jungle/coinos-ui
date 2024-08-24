import { auth, get } from "$lib/utils";
import { fail, redirect } from "@sveltejs/kit";
import parse from "$lib/parse";

export async function load({ cookies, params, request, url }) {
  let { id } = params;
  let { token, status } = await get(`/cash/${id}`);
  let { spent, total, mint, external } = status;
  return { id, token, spent, total, mint, external };
}
