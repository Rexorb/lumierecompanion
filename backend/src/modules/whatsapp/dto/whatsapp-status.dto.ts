export interface WhatsappStatusDto {
  configured: boolean;
  status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'UNAVAILABLE';
  phoneMasked?: string;
  connectedAt?: string;
}

export interface WhatsappQrDto {
  count: number;
  base64: string | null;
}
