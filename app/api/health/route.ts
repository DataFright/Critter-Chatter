import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    ok: true,
    label: process.env.APP_LABEL ?? 'StepKey',
    model: 'stepfun/step-3.5-flash:free',
  })
}
