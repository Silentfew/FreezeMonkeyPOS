import { DailyCloseoutSummary } from '@/domain/reports/dailyCloseout';
import { readJSON, writeJSON } from './jsonStore';

const CLOSEOUT_DIR = 'meta/closeouts';

function closeoutFilePath(date: string): string {
  return `${CLOSEOUT_DIR}/${date}.json`;
}

export async function readDailyCloseout(date: string): Promise<DailyCloseoutSummary | null> {
  return readJSON<DailyCloseoutSummary | null>(closeoutFilePath(date), null);
}

export async function saveDailyCloseout(summary: DailyCloseoutSummary): Promise<void> {
  await writeJSON(closeoutFilePath(summary.date), summary);
}
