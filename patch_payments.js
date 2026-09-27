const fs = require('fs');
const path = 'src/lib/payments.ts';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes("import { createNotification } from './notifications'")) {
  code = code.replace(
    "import { supabase } from './supabase';",
    "import { supabase } from './supabase';\nimport { createNotification } from './notifications';"
  );
}

const targetReturn = "return finalPayment;";
code = code.replace(targetReturn, `
  try {
    if (status === 'paid') {
      await createNotification({
        user_id: payment.customer_id,
        type: 'payment_success',
        title: 'Payment Successful 💳',
        body: 'Payment of ₹' + payment.amount + ' received successfully.',
        related_id: finalPayment.id,
        related_type: 'payment'
      });
    } else if (status === 'failed') {
      await createNotification({
        user_id: payment.customer_id,
        type: 'payment_failed',
        title: 'Payment Failed ⚠️',
        body: 'Waiting/Failed on payment of ₹' + payment.amount + '. Please check.',
        related_id: finalPayment.id,
        related_type: 'payment'
      });
    }
  } catch (err) {
    console.error('Failed to create payment notification:', err);
  }

  return finalPayment;
`);

fs.writeFileSync(path, code);
