import * as jose from 'jose';

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || '';
const API_KEY = import.meta.env.VITE_LIVEKIT_API_KEY || 'APIdub3CsA3TNJE';
const API_SECRET = import.meta.env.VITE_LIVEKIT_API_SECRET || 'CptL3A3BQjVaaFzG9f0hbtz23YfQvVuB0cerptM1UbyA';

export const livekitService = {
  getWsUrl(): string {
    return LIVEKIT_URL;
  },

  /**
   * Генерация Access Token для подключения к комнате LiveKit
   */
  async generateToken(roomName: string, participantIdentity: string, participantName: string): Promise<string> {
    const secretBuffer = new TextEncoder().encode(API_SECRET);

    const token = await new jose.SignJWT({
      video: {
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      },
      name: participantName || participantIdentity,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer(API_KEY)
      .setSubject(participantIdentity) // Уникальный ID участника в комнате
      .setExpirationTime('3h')
      .setNotBefore('0s')
      .sign(secretBuffer);

    return token;
  }
};