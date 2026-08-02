import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, msg } = body;

    const cleanPhone = String(phone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      return NextResponse.json(
        { success: false, detail: 'Please specify a valid phone number.' },
        { status: 400 }
      );
    }

    const payloadText = JSON.stringify({
      phone: cleanPhone,
      msg: msg || 'Welcome to QuantStock!',
    });

    console.log(`[WhatsApp Proxy] Dispatching raw JSON to HTTP endpoint: ${payloadText}`);

    // Call http://api.quantstock.pranab.xyz/api/send with raw application/json
    let response: Response;
    try {
      response = await fetch('http://api.quantstock.pranab.xyz/api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: payloadText,
      });
    } catch (httpError: any) {
      console.warn('[HTTP Proxy failed, trying HTTPS fallback]:', httpError?.message);
      response = await fetch('https://api.quantstock.pranab.xyz/api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: payloadText,
      });
    }

    const textResponse = await response.text();
    let data: any = textResponse;
    try {
      data = JSON.parse(textResponse);
    } catch {
      data = { raw: textResponse };
    }

    console.log('[WhatsApp API Server Response]:', response.status, data);

    return NextResponse.json({
      success: response.ok && (data?.success !== false),
      status: response.status,
      message: typeof data === 'object' ? (data?.message || data?.error || data?.status || textResponse) : textResponse,
      raw_response: data,
    });
  } catch (error: any) {
    console.error('[WhatsApp Proxy Exception]:', error);
    return NextResponse.json(
      {
        success: false,
        detail: error.message || 'Failed to dispatch WhatsApp message via server proxy.',
        raw_response: { error: error.message },
      },
      { status: 500 }
    );
  }
}
