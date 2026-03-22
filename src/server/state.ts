import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export type MonitorState = {
  lastTriggeredTimestamp: string | null
  lastCheckedAt: string | null
}

const DEFAULT_STATE: MonitorState = {
  lastTriggeredTimestamp: null,
  lastCheckedAt: null,
}

export async function readMonitorState(filePath: string): Promise<MonitorState> {
  try {
    const content = await readFile(filePath, 'utf8')
    return {
      ...DEFAULT_STATE,
      ...(JSON.parse(content) as Partial<MonitorState>),
    }
  } catch {
    return DEFAULT_STATE
  }
}

export async function writeMonitorState(filePath: string, state: MonitorState) {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(state, null, 2), 'utf8')
}
