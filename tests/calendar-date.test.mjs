import assert from "node:assert/strict";
import fs from "node:fs";
import { test, mock } from "node:test";
import mysql from "mysql2/promise";
import { calendarDateInput, formatProjectCalendarDate } from "../src/lib/calendar-date.ts";

test("Project SQL DATE stays the same calendar day in UTC, UTC+7 and UTC-7", () => {
  const previous = process.env.TZ;
  try {
    for (const timezone of ["UTC", "Asia/Ho_Chi_Minh", "America/Los_Angeles"]) {
      process.env.TZ = timezone;
      assert.equal(calendarDateInput("2026-10-07"), "2026-10-07");
      assert.equal(formatProjectCalendarDate("2026-10-07", null), "7/10/2026");
      assert.equal(calendarDateInput("2024-02-29"), "2024-02-29");
      assert.equal(formatProjectCalendarDate("2024-02-29", null), "29/2/2024");
    }
    process.env.TZ = "Asia/Ho_Chi_Minh";
    // Reproduce the old driver-local-midnight -> toISOString bug explicitly.
    assert.equal(new Date(2026, 9, 7).toISOString().slice(0, 10), "2026-10-06");
  } finally {
    if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
  }
});

test("calendar dates reject rollover/instants and preserve the editorial date label", () => {
  for (const value of [null, "", "0000-00-00", "2026-02-29", "2026-02-31", "2026-13-01", "2026-01-00", "2026-1-7", "2026-10-07T00:00:00Z", "2026-10-07T00:00:00+07:00"]) {
    assert.equal(calendarDateInput(value), "");
    assert.equal(formatProjectCalendarDate(value, null), "");
  }
  assert.equal(formatProjectCalendarDate("2026-10-07", "  Quý IV/2026  "), "Quý IV/2026");
  assert.equal(formatProjectCalendarDate(null, "Năm 2026"), "Năm 2026");
});

test("mysql2 preserves only DATE strings without connecting or changing timestamp decoding", async () => {
  const keys = ["MYSQL_HOST", "MYSQL_USER", "MYSQL_DATABASE", "MYSQL_PORT", "MYSQL_SSL"];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  let captured;
  const fixturePool = {};
  const stub = mock.method(mysql, "createPool", options => { captured = options; return fixturePool; });
  try {
    process.env.MYSQL_HOST = "127.0.0.1";
    process.env.MYSQL_USER = "unit_fixture_no_connection";
    process.env.MYSQL_DATABASE = "unit_fixture_no_connection";
    process.env.MYSQL_PORT = "3306";
    process.env.MYSQL_SSL = "false";
    const { getDatabasePool } = await import("../src/lib/db.ts?date-decoder-test");
    assert.equal(getDatabasePool(), fixturePool);
    assert.deepEqual(captured.dateStrings, ["DATE"]);
    assert.ok(!Object.hasOwn(captured, "timezone"));
    assert.equal(getDatabasePool(), fixturePool);
    assert.equal(stub.mock.callCount(), 1);
  } finally {
    stub.mock.restore();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test("Admin edit and public repository use the same date-only contract", () => {
  const edit = fs.readFileSync(new URL("../src/app/(admin)/admin/(protected)/projects/[id]/edit/page.tsx", import.meta.url), "utf8");
  const repository = fs.readFileSync(new URL("../src/lib/projects-repository.ts", import.meta.url), "utf8");
  assert.ok(edit.includes("calendarDateInput(project.contract_date)"));
  assert.ok(!edit.includes("toISOString"));
  assert.ok(repository.includes("formatProjectCalendarDate(row.contract_date, row.date_display)"));
});
