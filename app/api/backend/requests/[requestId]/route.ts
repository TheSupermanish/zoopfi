export const runtime = 'nodejs';
import { handler, ok, bad, body } from '@/app/lib/server/route-utils';
import { PaymentRequest } from '@/app/lib/server/models';

// PUT /api/backend/requests/:requestId - Update payment request status
export const PUT = handler(async (req: Request, { params }: { params: Promise<{ requestId: string }> }) => {
  const { requestId } = await params;
  const { status, txHash } = await body<{ status: string; txHash?: string }>(req);

  if (!['paid', 'cancelled'].includes(status)) {
    return bad('Invalid status', 400);
  }

  const update: any = { status };
  if (txHash) {
    update.txHash = txHash;
  }

  const request = await PaymentRequest.findByIdAndUpdate(
    requestId,
    update,
    { new: true }
  );

  if (!request) {
    return bad('Request not found', 404);
  }

  return ok({
    message: 'Request updated',
    request,
  });
});
