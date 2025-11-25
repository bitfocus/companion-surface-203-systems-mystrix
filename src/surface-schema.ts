import type { SurfaceSchemaLayoutDefinition } from '@companion-surface/base'
import { COLUMNS, createControlId, ROWS } from './util.js'

export function createSurfaceSchema(): SurfaceSchemaLayoutDefinition {
	const surfaceLayout: SurfaceSchemaLayoutDefinition = {
		stylePresets: {
			default: {
				colors: 'hex',
			},
		},
		controls: {},
	}

	for (let y = 0; y < ROWS; y++) {
		for (let x = 0; x < COLUMNS; x++) {
			surfaceLayout.controls[createControlId(x, y)] = {
				row: y,
				column: x,
			}
		}
	}

	return surfaceLayout
}
