export type GroupStatus = "Active" | "Inactive"

export type GroupRecord = {
  id: string
  code: string
  name: string
  description: string
  status: GroupStatus
  createdAt: string
  updatedAt: string
}

export const GROUPS_STORAGE_KEY = "absensi.people.groups"

export const seedGroups: GroupRecord[] = [
  {
    id: "no_group",
    code: "no-group",
    name: "No Group",
    description: "Members without a group",
    status: "Active",
    createdAt: "2026-03-25T09:00:00+07:00",
    updatedAt: "2026-03-25T09:00:00+07:00",
  },
  {
    id: "qurani",
    code: "qurani",
    name: "Qurani",
    description: "",
    status: "Active",
    createdAt: "2026-03-25T09:05:00+07:00",
    updatedAt: "2026-03-25T09:05:00+07:00",
  },
  {
    id: "iot",
    code: "IOT",
    name: "Absensi",
    description: "",
    status: "Active",
    createdAt: "2026-03-25T09:10:00+07:00",
    updatedAt: "2026-03-25T09:10:00+07:00",
  },
]

export function slugifyGroupCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['".]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function loadGroups(): GroupRecord[] {
  if (typeof window === "undefined") return []

  const stored = window.localStorage.getItem(GROUPS_STORAGE_KEY)
  if (stored === null) {
    window.localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(seedGroups))
    return seedGroups
  }

  try {
    const parsed = JSON.parse(stored) as Partial<GroupRecord>[]
    return parsed
      .filter((item) => typeof item?.code === "string" && typeof item?.name === "string")
      .map((item, index) => ({
        id: item.id || `group_${index}_${slugifyGroupCode(item.code || item.name || "group")}`,
        code: item.code?.trim() || slugifyGroupCode(item.name || item.code || "group"),
        name: item.name?.trim() || item.code?.trim() || "Unnamed Group",
        description: item.description?.trim() || "",
        status: item.status === "Inactive" ? "Inactive" : "Active",
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString(),
      }))
  } catch {
    window.localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(seedGroups))
    return seedGroups
  }
}

export function persistGroups(groups: GroupRecord[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups))
}
