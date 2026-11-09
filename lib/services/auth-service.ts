import { authenticate, createSession, type SessionPayload } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";
import { fail, type ServiceResult } from "@/lib/api";

export const authService = {
  async loginFromRequest(input: {
    body: unknown;
    headers: Headers;
    ipFallback?: string | null;
  }): Promise<ServiceResult<SessionPayload>> {
    const ip = clientIp(input.headers, input.ipFallback);
    const limit = await checkRateLimit(`login:${ip}`, 10, 60_000);
    if (!limit.allowed) {
      return fail(429, "Muitas tentativas. Aguarde e tente novamente.");
    }

    const parsed = loginSchema.safeParse(input.body);
    if (!parsed.success) {
      return fail(400, "E-mail ou senha inválidos.");
    }

    const session = await authenticate(parsed.data.email, parsed.data.password);
    if (!session) {
      return fail(401, "E-mail ou senha incorretos.");
    }

    await createSession(session);
    return { ok: true, data: session };
  },
};
