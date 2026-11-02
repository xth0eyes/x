import axios, { AxiosResponse } from 'axios';

interface TronScanTransactionInfo {
  contractRet: string;
  confirmed: boolean;
  hash: string;
  timestamp: number;
  ownerAddress: string;
  toAddress: string;
  amount?: string;
  contractType?: number;
  contractData?: {
    owner_address?: string;
    to_address?: string;
    amount?: number;
    resource?: string;
    receiver_address?: string;
    balance?: number;
    unfreeze_amount?: number;
  };
}

interface SimpleTransactionInfo {
  amountInTrx: string;
  from: string;
  to: string;
  success: boolean;
  txHash: string;
  timestamp: number;
  doneAfter4Mins: boolean;
  contractType?: number;
}

function fromSun(sun: string | number): string {
  const value = typeof sun === 'string' ? parseFloat(sun) : sun;
  if (isNaN(value)) return '0';
  return (value / 1_000_000).toString();
}

function extractAmount(data: TronScanTransactionInfo): string {
  if (data.amount && parseFloat(data.amount) > 0) {
    return data.amount;
  }

  const cd = data.contractData;
  if (!cd) return '0';

  if (cd.amount && cd.amount > 0) return cd.amount.toString();
  if (cd.unfreeze_amount && cd.unfreeze_amount > 0) return cd.unfreeze_amount.toString();
  if (cd.balance && cd.balance > 0) return cd.balance.toString();

  return '0';
}

function extractFrom(data: TronScanTransactionInfo): string {
  return (
    data.contractData?.owner_address ||
    data.ownerAddress ||
    ''
  );
}

function extractTo(data: TronScanTransactionInfo): string {
  return (
    data.contractData?.to_address ||
    data.contractData?.receiver_address ||
    data.toAddress ||
    ''
  );
}

export async function getTransactionInfo(txHash: string): Promise<SimpleTransactionInfo> {
  const baseUrl = 'https://apilist.tronscanapi.com/api';

  try {
    const response: AxiosResponse<TronScanTransactionInfo> = await axios.get(
      `${baseUrl}/transaction-info`,
      {
        params: { hash: txHash },
        headers: { 'Accept': 'application/json' },
        timeout: 10_000,
      }
    );

    const data = response.data;

    const amountInTrx = fromSun(extractAmount(data));
    const doneAfter4Mins = (data.timestamp + 4 * 60 * 1000) < Date.now();

    return {
      amountInTrx,
      from: extractFrom(data) as any,
      to: extractTo(data) as any,
      success: data.contractRet === 'SUCCESS' as any,
      txHash: data.hash || txHash as any,
      timestamp: data.timestamp as any,
      doneAfter4Mins,
      contractType: data.contractType as any,
    };

  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `خطا در درخواست به TronScan: ${error.response?.status} - ${error.message}`
      );
    }
    throw error;
  }
}

// async function main() {
//   const txHash = '3b64ad97a2c136378ad7b9454204c9818b33dec18bcd9deef8ad5033a9d23b76';

//   try {
//     const info = await getTransactionInfo(txHash);

//     console.log('=== اطلاعات تراکنش ===');
//     console.log(`هش تراکنش: ${info.txHash}`);
//     console.log(`مقدار (TRX): ${info.amountInTrx}`);
//     console.log(`فرستنده: ${info.from}`);
//     console.log(`گیرنده: ${info.to}`);
//     console.log(`زمان: ${new Date(info.timestamp).toLocaleString('fa-IR')}`);
//     console.log(`وضعیت: ${info.success ? '✅ موفق' : '❌ ناموفق'}`);
//   } catch (err) {
//     console.error('خطا در دریافت اطلاعات:', (err as Error).message);
//   }
// }

// main();

// after 4 mins