export const ROWS = 8
export const COLUMNS = 8

export function createControlId(x: number, y: number): string {
	return `${y}/${x}`
}

export function parseControlId(controlId: string): { y: number; x: number } {
	const [rowStr, colStr] = controlId.split('/')
	return {
		y: parseInt(rowStr, 10),
		x: parseInt(colStr, 10),
	}
}
