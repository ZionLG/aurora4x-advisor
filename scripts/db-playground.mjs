/**
 * Aurora DB Playground
 *
 * Uses sql.js (pure JS SQLite) — no native modules, no locking issues.
 * Works even while Aurora is running.
 *
 * Run: node scripts/db-playground.mjs [DB_PATH] --command [ARG]
 */

import initSqlJs from 'sql.js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const args = process.argv.slice(2)
const dbArgIdx = args.indexOf('--db')
const DB_PATH = dbArgIdx >= 0 ? args[dbArgIdx + 1] :
  process.env.AURORA_DB || 'C:/Programming/aurora4x-advisor/AuroraPatch-master/AuroraPatch/bin/Debug/AuroraDB.db'

const SQL = await initSqlJs()
const buf = readFileSync(resolve(DB_PATH))
const db = new SQL.Database(buf)

function query(sql) {
  try {
    const [result] = db.exec(sql)
    if (!result) return []
    return result.values.map(row => Object.fromEntries(result.columns.map((c, i) => [c, row[i]])))
  } catch (e) { return [{ _error: e.message }] }
}

function getAllTables() {
  return query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").map(r => r.name)
}

function getSchema(table) {
  return query(`PRAGMA table_info("${table}")`)
}

function getRowCount(table) {
  const r = query(`SELECT COUNT(*) as c FROM "${table}"`)[0]
  return r?.c ?? -1
}

function printTable(rows, maxCols = 10) {
  if (!rows.length || rows[0]?._error) { console.log(rows[0]?._error ? `  Error: ${rows[0]._error}` : '  (empty)'); return }
  const keys = Object.keys(rows[0]).slice(0, maxCols)
  const widths = keys.map(k => Math.max(k.length, ...rows.map(r => String(r[k] ?? 'NULL').substring(0, 30).length)))
  console.log('  ' + keys.map((k, i) => k.padEnd(widths[i] + 2)).join(''))
  console.log('  ' + widths.map(w => '-'.repeat(w + 2)).join(''))
  for (const row of rows) {
    console.log('  ' + keys.map((k, i) => String(row[k] ?? 'NULL').substring(0, 30).padEnd(widths[i] + 2)).join(''))
  }
}

const cmd = args.find(a => a.startsWith('--'))?.replace('--', '')
const cmdIdx = args.indexOf(`--${cmd}`)
const cmdArg = cmdIdx >= 0 ? args[cmdIdx + 1] : undefined

switch (cmd) {
  case 'tables': {
    const tables = getAllTables()
    console.log(`\n📋 ${tables.length} tables\n`)
    const groups = { FCT: [], DIM: [], other: [] }
    for (const t of tables) {
      if (t.startsWith('FCT_')) groups.FCT.push(t)
      else if (t.startsWith('DIM_')) groups.DIM.push(t)
      else groups.other.push(t)
    }
    for (const [prefix, list] of Object.entries(groups)) {
      if (!list.length) continue
      console.log(`${prefix} (${list.length}):`)
      for (const t of list) console.log(`  ${t.padEnd(45)} ${getRowCount(t)} rows`)
      console.log()
    }
    break
  }

  case 'schema': {
    if (!cmdArg) { console.log('Usage: --schema TABLE'); break }
    const cols = getSchema(cmdArg)
    console.log(`\n📐 ${cmdArg} (${cols.length} columns):\n`)
    for (const col of cols) {
      console.log(`  ${String(col.name).padEnd(30)} ${String(col.type || '?').padEnd(15)} ${col.notnull ? 'NOT NULL' : ''}${col.pk ? ' PK' : ''}`)
    }
    break
  }

  case 'sample': {
    if (!cmdArg) { console.log('Usage: --sample TABLE [N]'); break }
    const limit = args[cmdIdx + 2] || 5
    console.log(`\n🔍 ${cmdArg}:\n`)
    printTable(query(`SELECT * FROM "${cmdArg}" LIMIT ${limit}`))
    break
  }

  case 'query': {
    if (!cmdArg) { console.log('Usage: --query "SQL"'); break }
    const rows = query(cmdArg)
    console.log(`\n📊 ${rows.length} rows:\n`)
    printTable(rows.slice(0, 30))
    if (rows.length > 30) console.log(`  ... ${rows.length - 30} more`)
    break
  }

  case 'search': {
    if (!cmdArg) { console.log('Usage: --search TERM'); break }
    const term = cmdArg.toLowerCase()
    console.log(`\n🔎 "${term}"\n`)
    const tables = getAllTables()
    const mt = tables.filter(t => t.toLowerCase().includes(term))
    if (mt.length) { console.log('Tables:'); mt.forEach(t => console.log(`  ${t} (${getRowCount(t)})`)) }
    console.log('\nColumns:')
    let n = 0
    for (const t of tables) for (const c of getSchema(t)) if (String(c.name).toLowerCase().includes(term)) { console.log(`  ${t}.${c.name} (${c.type || '?'})`); n++ }
    if (!n) console.log('  (none)')
    break
  }

  case 'compare': {
    console.log(`\n📊 FCT tables with data:\n`)
    for (const t of getAllTables().filter(t => t.startsWith('FCT_'))) {
      const c = getRowCount(t)
      console.log(`${c > 0 ? '✅' : '⬜'} ${t.padEnd(45)} ${c}`)
    }
    break
  }

  case 'game': {
    console.log('\n🎮 Games\n')
    for (const g of query('SELECT GameID, GameName, StartYear, GameTime FROM FCT_Game')) {
      console.log(`[${g.GameID}] ${g.GameName} — Year ${g.StartYear}, ${Math.floor(g.GameTime / 86400)}d`)
      for (const r of query(`SELECT RaceID, RaceName FROM FCT_Race WHERE GameID = ${g.GameID} AND NPR = 0`)) {
        const f = query(`SELECT COUNT(*) as c FROM FCT_Fleet WHERE GameID=${g.GameID} AND RaceID=${r.RaceID}`)[0]
        const s = query(`SELECT COUNT(*) as c FROM FCT_Ship s JOIN FCT_Fleet fl ON s.FleetID=fl.FleetID WHERE fl.GameID=${g.GameID} AND fl.RaceID=${r.RaceID}`)[0]
        const p = query(`SELECT COUNT(*) as c FROM FCT_Population WHERE GameID=${g.GameID} AND RaceID=${r.RaceID}`)[0]
        console.log(`  ${r.RaceName}: ${f?.c??0} fleets, ${s?.c??0} ships, ${p?.c??0} pops`)
      }
    }
    break
  }

  case 'research': {
    const gid = cmdArg || 140
    console.log(`\n🔬 Research (GameID=${gid})\n`)
    console.log('Projects:')
    printTable(query(`
      SELECT rp.ProjectID, ts.Name as TechName, ts.DevelopCost, rp.ResearchPointsRequired as Remaining,
        rp.Facilities as Labs, rp.Pause, p.PopName as Colony
      FROM FCT_ResearchProject rp
      JOIN FCT_TechSystem ts ON rp.TechID = ts.TechSystemID
      LEFT JOIN FCT_Population p ON rp.PopulationID = p.PopulationID AND p.GameID = ${gid}
      WHERE rp.GameID = ${gid}`))
    console.log('\nTech categories (via DIM tables):')
    printTable(query(`
      SELECT rf.FieldName as Field, rf.Abbreviation as Abbr,
        COUNT(*) as Total,
        SUM(CASE WHEN rt.TechID IS NOT NULL THEN 1 ELSE 0 END) as Researched
      FROM FCT_TechSystem ts
      JOIN DIM_TechType tt ON ts.TechTypeID = tt.TechTypeID
      JOIN DIM_ResearchField rf ON tt.FieldID = rf.ResearchFieldID
      LEFT JOIN FCT_RaceTech rt ON ts.TechSystemID = rt.TechID AND rt.GameID = ${gid}
      WHERE ts.RaceID = 0 AND rf.DoNotDisplay != 1
      GROUP BY rf.FieldName
      ORDER BY rf.FieldName`))
    break
  }

  case 'fleets': {
    const gid = cmdArg || 140
    console.log(`\n⚓ Fleets (GameID=${gid})\n`)
    printTable(query(`
      SELECT f.FleetID, f.FleetName, f.Speed, f.Xcor, f.Ycor, r.RaceName,
        (SELECT COUNT(*) FROM FCT_Ship s WHERE s.FleetID=f.FleetID) as ShipCount
      FROM FCT_Fleet f JOIN FCT_Race r ON f.RaceID=r.RaceID
      WHERE f.GameID=${gid} AND r.NPR=0 ORDER BY f.FleetName`))
    break
  }

  case 'minerals': {
    const gid = cmdArg || 140
    console.log(`\n💎 Minerals (GameID=${gid})\n`)
    printTable(query(`
      SELECT p.PopName, SUM(wd.Amount) as TotalStockpile
      FROM FCT_WealthData wd
      JOIN FCT_Population p ON wd.PopulationID = p.PopulationID
      WHERE p.GameID = ${gid}
      GROUP BY p.PopName
      ORDER BY TotalStockpile DESC
      LIMIT 10`))
    break
  }

  case 'dump-schema': {
    console.log('\n📐 Schema dump (non-empty tables)\n')
    for (const t of getAllTables()) {
      const count = getRowCount(t)
      if (count === 0) continue
      const cols = getSchema(t)
      console.log(`\n${t} (${count} rows, ${cols.length} cols):`)
      for (const c of cols) console.log(`  ${String(c.name).padEnd(30)} ${c.type || '?'}`)
    }
    break
  }

  default:
    console.log(`
Aurora DB Playground (sql.js — works while Aurora is running)

  node scripts/db-playground.mjs [DB_PATH] --command [ARG]

  --tables              All tables with row counts
  --schema TABLE        Column schema
  --sample TABLE [N]    First N rows
  --query "SQL"         Run SQL
  --search TERM         Find tables/columns
  --compare             FCT tables data status
  --game                Game summary
  --research GID        Research projects + tech categories
  --fleets GID          Fleet data
  --minerals GID        Mineral stockpiles
  --dump-schema         All non-empty table schemas

DB: ${DB_PATH}
`)
}

db.close()
