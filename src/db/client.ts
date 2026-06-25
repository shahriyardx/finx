import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseSync } from 'expo-sqlite'

import * as schema from '@/db/schema'

const expo = openDatabaseSync('finx.db', { enableChangeListener: true })

export const db = drizzle(expo, { schema })
export { schema }
