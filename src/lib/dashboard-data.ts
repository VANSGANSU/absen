"use client"

import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  AttendanceRecordEntry,
  AttendanceStatus,
} from "@/lib/attendance-records-store"
import type { AttendanceDeviceRecord, AttendanceDeviceType } from "@/lib/devices-store"
import type { AttendanceLocationRecord } from "@/lib/locations-store"

export type TimesheetRecord = {
  id: string
  member: string
  project: string
  task: string
  date: string
  start: string
  end: string
  reason: string
  billable: boolean
  source: string
}

export type OrganizationMember = {
  id: string
  name: string
  group: string
  groupId?: string | null
  groupCode?: string
  initials: string
  identification?: string
  gender?: string
  religion?: string
  avatar?: string
  status: string
}

export type GroupRecord = {
  id: string
  code: string
  name: string
  description: string
  status: "Active" | "Inactive"
  createdAt: string
  updatedAt: string
}

export type GroupStatus = GroupRecord["status"]
 
export type PositionRecord = {
  id: string
  code: string
  name: string
  description: string
  status: "Active" | "Inactive"
  createdAt: string
  updatedAt: string
}

export type PositionStatus = PositionRecord["status"]

function formatTimeValue(value: string | null) {
  return value ? value.slice(0, 5) : null
}

function formatCreatedDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value))
}

function formatGroupDate(value: string | null | undefined) {
  return value ? new Date(value).toISOString() : new Date().toISOString()
}

function toGroupStatus(value: string | null | undefined) {
  return value === "Inactive" ? "Inactive" : "Active"
}

export async function ensureDashboardSeed(supabase: SupabaseClient) {
  const { error } = await supabase.rpc("seed_dashboard_data")
  if (error) {
    // Seed function may reference outdated columns — skip gracefully if data already exists
    console.warn("Dashboard seed skipped:", error.message)
  }
}

export async function fetchMembers(supabase: SupabaseClient): Promise<OrganizationMember[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select(
      "id, full_name, group_id, initials, avatar_url, identification, gender, religion, status, group_data:group_id (id, code, name, status)"
    )
    .order("created_at", { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []).map((item: any) => {
    const groupData = Array.isArray(item.group_data) ? item.group_data[0] : item.group_data

    return {
      id: item.id,
      name: item.full_name,
      groupId: item.group_id || groupData?.id || null,
      groupCode: groupData?.code || "",
      group: groupData?.name || groupData?.code || (item.group_id ? "" : "No Group"),
      initials: item.initials,
      identification: item.identification || "",
      gender: item.gender || "",
      religion: item.religion || "",
      avatar: item.avatar_url || "",
      status: item.status || "Active",
    }
  })
}

export async function fetchGroups(supabase: SupabaseClient): Promise<GroupRecord[]> {
  const { data, error } = await supabase
    .from("group")
    .select("id, code, name, description, status, created_at, updated_at")
    .order("created_at", { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []).map((item) => ({
    id: String(item.id),
    code: String(item.code),
    name: String(item.name),
    description: item.description || "",
    status: toGroupStatus(item.status),
    createdAt: formatGroupDate(item.created_at),
    updatedAt: formatGroupDate(item.updated_at),
  }))
}

export async function insertGroup(
  supabase: SupabaseClient,
  payload: Omit<GroupRecord, "id" | "createdAt" | "updatedAt">
) {
  const { error } = await supabase.from("group").insert({
    code: payload.code,
    name: payload.name,
    description: payload.description || null,
    status: payload.status,
  })

  if (error) {
    throw error
  }
}

export async function updateGroup(
  supabase: SupabaseClient,
  id: string,
  payload: Partial<Omit<GroupRecord, "id" | "createdAt" | "updatedAt">>
) {
  const { error } = await supabase
    .from("group")
    .update({
      ...(payload.code !== undefined ? { code: payload.code } : {}),
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.description !== undefined ? { description: payload.description || null } : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    throw error
  }
}

export async function deleteGroup(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("group").delete().eq("id", id)
 
  if (error) {
    throw error
  }
}

export async function fetchPositions(supabase: SupabaseClient): Promise<PositionRecord[]> {
  const { data, error } = await supabase
    .from("position")
    .select("id, code, name, description, status, created_at, updated_at")
    .order("created_at", { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []).map((item) => ({
    id: String(item.id),
    code: String(item.code),
    name: String(item.name),
    description: item.description || "",
    status: toGroupStatus(item.status), // Reuse group status logic
    createdAt: formatGroupDate(item.created_at),
    updatedAt: formatGroupDate(item.updated_at),
  }))
}

export async function insertPosition(
  supabase: SupabaseClient,
  payload: Omit<PositionRecord, "id" | "createdAt" | "updatedAt">
) {
  const { error } = await supabase.from("position").insert({
    code: payload.code,
    name: payload.name,
    description: payload.description || null,
    status: payload.status,
  })

  if (error) {
    throw error
  }
}

export async function updatePosition(
  supabase: SupabaseClient,
  id: string,
  payload: Partial<Omit<PositionRecord, "id" | "createdAt" | "updatedAt">>
) {
  const { error } = await supabase
    .from("position")
    .update({
      ...(payload.code !== undefined ? { code: payload.code } : {}),
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.description !== undefined ? { description: payload.description || null } : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    throw error
  }
}

export async function deletePosition(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("position").delete().eq("id", id)

  if (error) {
    throw error
  }
}

export async function updateMember(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<OrganizationMember>
) {
  const payload: any = {}
  if (updates.name !== undefined) payload.full_name = updates.name
  if (updates.group !== undefined) payload.group = updates.group
  if (updates.groupId !== undefined) payload.group_id = updates.groupId
  if (updates.identification !== undefined) payload.identification = updates.identification
  if (updates.gender !== undefined) payload.gender = updates.gender
  if (updates.religion !== undefined) payload.religion = updates.religion
  if (updates.status !== undefined) payload.status = updates.status

  const { error } = await supabase.from("organization_members").update(payload).eq("id", id)

  if (error) {
    throw error
  }
}

export async function insertMembersBulk(
  supabase: SupabaseClient,
  members: Array<{
    name: string
    group: string
    groupId?: string | null
    identification?: string
    gender?: string
    religion?: string
  }>
) {
  const payload = members.map((m) => ({
    full_name: m.name,
    group: m.group,
    group_id: m.groupId ?? null,
    identification: m.identification,
    gender: m.gender,
    religion: m.religion,
    status: (m as any).status || 'Active',
  }))

  const { error } = await supabase.from("organization_members").insert(payload)

  if (error) {
    throw error
  }
}

export async function fetchLocations(
  supabase: SupabaseClient
): Promise<AttendanceLocationRecord[]> {
  const { data, error } = await supabase
    .from("attendance_locations")
    .select(
      "id, name, code, description, latitude, longitude, radius, type, active, require_selfie, require_gps"
    )
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    code: item.code,
    description: item.description,
    latitude: item.latitude,
    longitude: item.longitude,
    radius: item.radius,
    type: item.type,
    active: item.active,
    requireSelfie: item.require_selfie,
    requireGps: item.require_gps,
  }))
}

export async function insertLocation(
  supabase: SupabaseClient,
  payload: Omit<AttendanceLocationRecord, "id">
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Authentication required")

  const { error } = await supabase.from("attendance_locations").insert({
    user_id: user.id,
    name: payload.name,
    code: payload.code,
    description: payload.description,
    latitude: payload.latitude,
    longitude: payload.longitude,
    radius: payload.radius,
    type: payload.type,
    active: payload.active,
    require_selfie: payload.requireSelfie,
    require_gps: payload.requireGps,
  })

  if (error) {
    throw error
  }
}

export async function updateLocationStatus(
  supabase: SupabaseClient,
  id: string,
  active: boolean
) {
  const { error } = await supabase
    .from("attendance_locations")
    .update({ active })
    .eq("id", id)

  if (error) {
    throw error
  }
}

export async function fetchDevices(
  supabase: SupabaseClient
): Promise<AttendanceDeviceRecord[]> {
  const { data, error } = await supabase
    .from("attendance_devices")
    .select("id, name, serial_number, type, location_label, active, created_at")
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    serialNumber: item.serial_number,
    type: item.type as AttendanceDeviceType,
    location: item.location_label,
    active: item.active,
    createdAt: formatCreatedDate(item.created_at),
  }))
}

export async function insertDevice(
  supabase: SupabaseClient,
  payload: Omit<AttendanceDeviceRecord, "id" | "createdAt">
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Authentication required")

  const { error } = await supabase.from("attendance_devices").insert({
    user_id: user.id,
    name: payload.name,
    serial_number: payload.serialNumber,
    type: payload.type,
    location_label: payload.location,
    active: payload.active,
  })

  if (error) {
    throw error
  }
}

export async function fetchAttendanceRecords(
  supabase: SupabaseClient
): Promise<AttendanceRecordEntry[]> {
  const { data, error } = await supabase
    .from("attendance_records")
    .select(
      "id, member_id, member_name, member_group, attendance_date, check_in, break_in, break_out, check_out, status, work_hours"
    )
    .order("attendance_date", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []).map((item: any) => ({
    id: item.id,
    memberId: item.member_id ?? "",
    memberName: item.member_name,
    memberGroup: item.member_group,
    date: item.attendance_date,
    checkIn: formatTimeValue(item.check_in),
    breakIn: formatTimeValue(item.break_in),
    breakOut: formatTimeValue(item.break_out),
    checkOut: formatTimeValue(item.check_out),
    status: item.status as AttendanceStatus,
    workHours: item.work_hours,
  }))
}

export async function insertAttendanceRecords(
  supabase: SupabaseClient,
  records: AttendanceRecordEntry[]
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Authentication required")

  const payload = records.map((record) => ({
    user_id: user.id,
    member_id: record.memberId || null,
    member_name: record.memberName,
    member_group: record.memberGroup,
    attendance_date: record.date,
    check_in: record.checkIn ? `${record.checkIn}:00` : null,
    break_in: record.breakIn ? `${record.breakIn}:00` : null,
    break_out: record.breakOut ? `${record.breakOut}:00` : null,
    check_out: record.checkOut ? `${record.checkOut}:00` : null,
    status: record.status,
    work_hours: record.workHours,
  }))

  console.log("Submitting Attendance Payload:", payload)
  const { data, error } = await supabase.from("attendance_records").insert(payload).select()

  if (error) {
    console.error("Supabase Insert Error:", error)
    throw error
  }
  console.log("Insert Success Data:", data)
}

export async function updateAttendanceRecord(
  supabase: SupabaseClient,
  id: string,
  record: AttendanceRecordEntry
) {
  const { error } = await supabase
    .from("attendance_records")
    .update({
      member_id: record.memberId || null,
      member_name: record.memberName,
      member_group: record.memberGroup,
      attendance_date: record.date,
      check_in: record.checkIn ? `${record.checkIn}:00` : null,
      break_in: record.breakIn ? `${record.breakIn}:00` : null,
      break_out: record.breakOut ? `${record.breakOut}:00` : null,
      check_out: record.checkOut ? `${record.checkOut}:00` : null,
      status: record.status,
      work_hours: record.workHours,
    })
    .eq("id", id)

  if (error) {
    throw error
  }
}

export async function deleteAttendanceRecord(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("attendance_records").delete().eq("id", id)

  if (error) {
    throw error
  }
}

export async function deleteAttendanceRecords(
  supabase: SupabaseClient,
  ids: string[]
) {
  const { error } = await supabase.from("attendance_records").delete().in("id", ids)

  if (error) {
    throw error
  }
}

export async function fetchTimesheetRecords(
  supabase: SupabaseClient
): Promise<TimesheetRecord[]> {
  const { data, error } = await supabase
    .from("timesheet_records")
    .select(
      "id, member, project, task, timesheet_date, start_time, end_time, reason, billable, source"
    )
    .order("created_at", { ascending: false })

  if (error) {
    // Table may not exist yet — return empty array gracefully
    console.warn("Timesheet fetch skipped:", error.message)
    return []
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    member: item.member,
    project: item.project,
    task: item.task,
    date: item.timesheet_date,
    start: item.start_time ?? "",
    end: item.end_time ?? "",
    reason: item.reason,
    billable: item.billable,
    source: item.source,
  }))
}

export async function insertTimesheetRecord(
  supabase: SupabaseClient,
  record: Omit<TimesheetRecord, "id">
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Authentication required")

  const { error } = await supabase.from("timesheet_records").insert({
    user_id: user.id,
    member: record.member,
    project: record.project,
    task: record.task,
    timesheet_date: record.date,
    start_time: record.start,
    end_time: record.end,
    reason: record.reason,
    billable: record.billable,
    source: record.source,
  })

  if (error) {
    throw error
  }
}

export async function deleteTimesheetRecord(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("timesheet_records").delete().eq("id", id)

  if (error) {
    throw error
  }
}
