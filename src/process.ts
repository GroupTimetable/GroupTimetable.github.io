import * as pdfjs from 'pdfjs-dist'
import * as U from './util.ts'

type Bounds = { l: number, r: number, t: number, b: number, cx: number, cy: number }

type Item = {
    i: number
    text: U.TextItem
    bounds: Bounds
}

export type GroupDaySchedule = {
    // Day of the week or specific date.
    day: string
    rows: {
        timeSlot: string // e.g. "8:30 - 10:00"
        // Class session text for one timetable cell, given as its four quadrants.
        // Treat every cell as a 2x2 grid of quadrants and fill exactly four strings,
        // in reading order: top-left, top-right, bottom-left, bottom-right. Each string
        // is a single line (no line breaks).
        // A cell may be divided vertically and/or horizontally, and a half may itself be
        // subdivided, so a cell can hold 1, 2, 3, or 4 distinct regions. Whatever the
        // layout, give each quadrant the text of the region covering it - a region that
        // covers two quadrants has its text repeated in both.
        // A cell may span several columns, so also consider them.
        names: [string, string, string, string]
    }[]
}

// Task: Extract one group's schedule from a timetable table.
// Table structure: Each column is a group. Each row is a class session (one time slot). Rows are grouped by day: the leftmost column contains a tall merged cell spanning all the rows that belong to the same day of the week or date.
// What to do: The user will name a group. Find that group's column and read down it, collecting the sessions for every day.
// Format: An array where each element represents one day, containing the sessions for that day.
export type GroupSchedule = GroupDaySchedule[]

export async function process(
    pageParser: U.PageParser,
    groupName: string,
    controller: AbortController,
) {
    pageParser.aquire()
    U.onAbort(controller, () => pageParser.release())

    const normalizedGroupName = normalizeName(groupName)

    if(pageParser.error) {
        throw pageParser.error
    }

    let pageI = 0
    let itemI = -1
    for(; pageI < pageParser.pages; pageI++) {
        if(controller.signal.aborted) throw controller

        const page = await pageParser.getPage(pageI)
        //console.log(page.text)
        itemI = page.text.findIndex(it => {
            if('str' in it) {
                if(normalizeName(it.str) === normalizedGroupName) return true
            }
            return false
        })
        if(itemI !== -1) break
    }

    if(pageI === pageParser.pages) {
        throw 'Имя группы не найдено в документе'
    }

    const page = await pageParser.getPage(pageI)
    const items: Item[] = page.text.map((it, i) => {
        return { i, text: it, bounds: calcItemBounds(it) }
    })
    const groupNameItem = items[itemI]

    const groupNames = items.filter(it => {
        return (
                it.text.str.trim()
                    && it.bounds.t > groupNameItem.bounds.b
                    && it.bounds.b < groupNameItem.bounds.t
            )
                || it === groupNameItem
    })
    groupNames.sort((a, b) => a.bounds.l - b.bounds.l)
    if(groupNames.length < 2) {
        throw 'Недостаточно названий групп для определения таблицы'
    }

    const columnWidth = (() => {
        const distances: number[] = []
        for(let i = 1; i < groupNames.length; i++) {
            const a = groupNames[i - 1]
            const b = groupNames[i]

            const distance = b.bounds.cx - a.bounds.cx
            distances.push(distance)
        }
        distances.sort((a, b) => a - b)
        return distances[Math.floor(distances.length / 2)]
    })()

    const timeSlotNames = items
        .filter(it => timeSlotRegex.test(it.text.str))
        .map(it => ({ ...it, number: parseInt(it.text.str) }))
        .sort((a, b) => -(a.bounds.t - b.bounds.t))

    const dayOfWeekItems = items
        .filter(it => daysOfWeekLower.includes(it.text.str.toLowerCase()))
        .sort((a, b) => -(a.bounds.t - b.bounds.t))

    if(timeSlotNames.length < 2) {
        throw 'Недостаточно названий пар для определения таблицы'
    }

    const rowHeight = (() => {
        const distances: number[] = []
        for(let i = 1; i < timeSlotNames.length; i++) {
            const a = timeSlotNames[i - 1]
            const b = timeSlotNames[i]

            const distance = a.bounds.cy - b.bounds.cy
            distances.push(distance)
        }
        distances.sort((a, b) => a - b)
        return distances[Math.floor(distances.length / 2)]
    })()

    const tableTop = timeSlotNames[0].bounds.cy + rowHeight * 0.5
    const tableLeft = groupNames[0].bounds.cx - columnWidth * 0.5
    const columns = Math.ceil((groupNames.at(-1)!.bounds.cx - tableLeft) / columnWidth)
    const rows = timeSlotNames.length

    // [top-left[], top-right[], bot-left[], bot,right[]][]
    const table: Item[][][] = Array(rows * columns).fill(undefined).map(() => [[], [], [], []])
    const cellAt = (row: number, col: number) => table[row * columns + col]

    for(let curI = 0; curI < items.length;) {
        let aaa = false
        const lines: Item[] = []
        for(; curI < items.length; curI++) {
            const item = items[curI]
            if(item.text.str.trim() === '' || item.text.height < 1) continue

            if(lines.length !== 0) {
                const prev = lines.at(-1)!
                // same line + overlap
                if(Math.abs(prev.bounds.l - item.bounds.l) > 2) break
                if(prev.bounds.b - (prev.bounds.t - prev.bounds.b) * 0.2 > item.bounds.t) break
            }
            lines.push(item)
        }
        if(lines.length === 0) continue

        const bounds = boundsUnion(lines.map(it => it.bounds))

        const cellXI = Math.floor((bounds.l + 2 - tableLeft) / columnWidth) // left aligned
        const cellYI = Math.floor((tableTop - bounds.cy) / rowHeight)

        if(aaa) console.log(cellXI, cellYI, lines)
        if(!(cellXI >= 0 && cellXI < columns && cellYI >= 0 && cellYI < rows)) continue
        const cell = cellAt(cellYI, cellXI)

        const cellXCenter = tableLeft + cellXI * columnWidth + columnWidth * 0.5
        const cellYCenter = tableTop - cellYI * rowHeight - rowHeight * 0.5

        const left = bounds.l < cellXCenter - 2
        const right = bounds.r >= cellXCenter + 2 || !left
        const top = bounds.t > cellYCenter + 2
        const bot = bounds.b <= cellYCenter - 2 || !top

        if(isBlocker(lines)) {
            if(cell[0].length === 0 && top && left) cell[0] = lines
            if(cell[1].length === 0 && top && right) cell[1] = lines
            if(cell[2].length === 0 && bot && left) cell[2] = lines
            if(cell[3].length === 0 && bot && right) cell[3] = lines
        }
        else {
            if(top && left) cell[0] = lines
            if(top && right) cell[1] = lines
            if(bot && left) cell[2] = lines
            if(bot && right) cell[3] = lines
        }

        if(left && right) {
            for(let x = cellXI + 1; x < columns; x++) {
                const cellLeft = tableLeft + x * columnWidth
                if(bounds.r <= cellLeft) break

                const cell = cellAt(cellYI, x)
                if(top) {
                    cell[0] = cell[1] = lines
                }
                if(bot) {
                    cell[2] = cell[3] = lines
                }
            }
        }
    }

    for(let colI = 0; colI < columns; colI++) {
        for(let rowI = 0; rowI < rows; rowI++) {
            const cell = table[colI * columns + rowI]

            if(cell[0].length === 0) {
                cell[0] = rowI === 0 ? [] : cellAt(colI, rowI - 1)[1]
            }
            if(cell[1].length === 0) {
                cell[1] = cellAt(colI, rowI)[0]
            }
            if(cell[2].length === 0) {
                cell[2] = rowI === 0 ? [] : cellAt(colI, rowI - 1)[3]
            }
            if(cell[3].length === 0) {
                cell[3] = cellAt(colI, rowI)[2]
            }
        }
    }

    for(let i = 0; i < table.length; i++) {
        table[i] = table[i].map(it => isBlocker(it) ? [] : it)
    }

    //tableToStrings(table, rows, columns)

    const dayBounds: number[] = [0]
    {
        let timeSlotI = 0
        for(let i = 0; i < dayOfWeekItems.length - 1; i++) {
            for(timeSlotI++; timeSlotI < timeSlotNames.length; timeSlotI++) {
                if(
                    parseInt(timeSlotNames[timeSlotI].text.str)
                        <= parseInt(timeSlotNames[timeSlotI - 1].text.str)
                ) {
                    break
                }
            }
            dayBounds.push(timeSlotI)
        }
        dayBounds.push(timeSlotNames.length)
    }

    const columnI = Math.floor((groupNameItem.bounds.cx - tableLeft) / columnWidth)

    const groupSchedule: GroupSchedule = []
    for(let dayI = 0; dayI < dayOfWeekItems.length; dayI++) {
        const begin = dayBounds[dayI]
        const end = dayBounds[dayI + 1]
        groupSchedule.push({
            day: dayOfWeekItems[dayI].text.str.trim(),
            rows: timeSlotNames.slice(begin, end).map((it, off) => {
                return {
                    timeSlot: it.text.str.trim(),
                    names: cellAt(begin + off, columnI)
                        .map(it => {
                            return it.map(it => it.text.str.trim()).join(' ')
                        }) as [string, string, string, string],
                }
            }),
        })
        groupSchedule.at(-1)!.rows = groupSchedule.at(-1)!.rows.slice(
            0,
            groupSchedule.at(-1)!.rows.findLastIndex(it => it.names.some(it => it !== '')) + 1,
        )
    }
    while(groupSchedule.length < 7) groupSchedule.push({ day: '', rows: [] })

    return groupSchedule
}

function isBlocker(lines: Item[]) {
    const text = lines.join('')
    return text && isFinite(Number(lines[0].text.str))
}

const daysOfWeek = [
    "Понедельник",
    "Вторник",
    "Среда",
    "Четверг",
    "Пятница",
    "Суббота",
    "Воскресенье"
];
const daysOfWeekLower = daysOfWeek.map(a => a.toLowerCase())

const timeSlotRegex = /^\d+-\p{L} пара$/u

const nonAlphaNumeric = /[^\p{L})\p{N}]/gu
function normalizeName(name: string) {
    var newName = name.replace(nonAlphaNumeric, '').toLowerCase();
    if(newName.length === 0) return name.trim()
    else return newName;
}

function calcItemBounds(item: U.TextItem): Bounds {
    const h = 1;
    let w = (item.width / item.height)
    if(!isFinite(w)) w = 0

    const op = [[0,0], [0,h], [w,0], [w,h]]
    const a = item.transform[0], b = item.transform[1], c = item.transform[2], d = item.transform[3]

    const min = Number.MIN_VALUE, max = Number.MAX_VALUE;
    const bs: Bounds = { l: max, b: max, r: min, t: min, cx: 0, cy: 0 }
    for(let i = 0; i < 4; i++) {
        const x = op[i][0]
        const y = op[i][1]

        const xp = a*x + c*y;
        const yp = b*x + d*y;

        bs.l = Math.min(bs.l, xp)
        bs.b = Math.min(bs.b, yp)
        bs.r = Math.max(bs.r, xp)
        bs.t = Math.max(bs.t, yp)
    }

    bs.l += item.transform[4]
    bs.r += item.transform[4]
    bs.t += item.transform[5]
    bs.b += item.transform[5]
    bs.cx = (bs.l + bs.r) * 0.5
    bs.cy = (bs.t + bs.b) * 0.5

    return bs
}

function boundsUnion(bounds: Bounds[]): Bounds {
    let t = -Infinity
    let l = Infinity
    let r = -Infinity
    let b = Infinity
    for(const bb of bounds) {
        t = Math.max(t, bb.t)
        l = Math.min(l, bb.l)
        r = Math.max(r, bb.r)
        b = Math.min(b, bb.b)
    }

    return {
        t, l, r, b,
        cx: (l + r) * 0.5,
        cy: (t + b) * 0.5,
    }
}

function tableToStrings(
    table: Item[][][],
    rows: number,
    columns: number
): [string[], string[], string[], string[]][][] {
    const result: [string[], string[], string[], string[]][][] = []

    for (let row = 0; row < rows; row++) {
        const rowData: [string[], string[], string[], string[]][] = []
        for (let col = 0; col < columns; col++) {
            const cell = table[row * columns + col]
            rowData.push([
                cell[0].map(item => item.text.str),
                cell[1].map(item => item.text.str),
                cell[2].map(item => item.text.str),
                cell[3].map(item => item.text.str),
            ])
        }
        console.log(rowData)
        //result.push(rowData)
    }

    return result
}
