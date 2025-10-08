import { PrismaClient } from '@prisma/client'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

function parseFrontMatter(src: string): Record<string, any> {
  const start = src.indexOf('---')
  if (start !== 0) return {}
  const end = src.indexOf('\n---', 3)
  if (end === -1) return {}
  const block = src.slice(3, end).trim()
  const obj: Record<string, any> = {}
  for (const line of block.split('\n')) {
    const m = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/)
    if (!m) continue
    const key = m[1]
    let val: any = m[2]
    if (/^\d+$/.test(val)) val = Number(val)
    else if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    obj[key] = val
  }
  return obj
}

async function seedLessons() {
  const lessonsDir = join(process.cwd(), 'packages', 'lessons', 'content')
  const files = readdirSync(lessonsDir).filter((f) => f.endsWith('.mdx'))
  for (const f of files) {
    const src = readFileSync(join(lessonsDir, f), 'utf8')
    const fm = parseFrontMatter(src)
    if (!fm.slug) continue
    await prisma.lesson.upsert({
      where: { slug: String(fm.slug) },
      update: {
        track: String(fm.track || ''),
        title: String(fm.title || fm.slug),
        summary: String(fm.summary || ''),
        contentUrl: `packages/lessons/content/${f}`,
        rubricId: String(fm.rubric || ''),
        order: Number(fm.order ?? 0),
        xpReward: Number(fm.xpReward ?? 10),
        badges: []
      },
      create: {
        slug: String(fm.slug),
        track: String(fm.track || ''),
        title: String(fm.title || fm.slug),
        summary: String(fm.summary || ''),
        contentUrl: `packages/lessons/content/${f}`,
        rubricId: String(fm.rubric || ''),
        order: Number(fm.order ?? 0),
        xpReward: Number(fm.xpReward ?? 10),
        badges: []
      }
    })
  }
}

async function seedRubrics() {
  const rubricsDir = join(process.cwd(), 'packages', 'core', 'rubrics')
  const files = readdirSync(rubricsDir).filter((f) => f.endsWith('.json'))
  for (const f of files) {
    const json = JSON.parse(readFileSync(join(rubricsDir, f), 'utf8'))
    await prisma.rubric.upsert({
      where: { id: String(json.id || f) },
      update: {
        name: String(json.id || f),
        version: Number(json.version ?? 1),
        kind: String(json.kind || 'quiz'),
        spec: json
      },
      create: {
        id: String(json.id || f),
        name: String(json.id || f),
        version: Number(json.version ?? 1),
        kind: String(json.kind || 'quiz'),
        spec: json
      }
    })
  }
}

async function main() {
  await seedRubrics()
  await seedLessons()
}

main()
  .then(async () => {
    await prisma.$disconnect()
    // eslint-disable-next-line no-console
    console.log('Seed completed')
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

