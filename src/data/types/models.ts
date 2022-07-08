export interface Migration {
  name: string
  hash?: string
  date_added: Date
  date_applied?: Date
  date_last_changed?: Date
  status: number
  script_author?: string
  changed_by?: string
}

export interface Backup {
  key: string
  value: string
  date: Date
}
