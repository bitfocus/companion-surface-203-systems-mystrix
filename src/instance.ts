import {
	CardGenerator,
	HostCapabilities,
	SurfaceDrawProps,
	SurfaceContext,
	SurfaceInstance,
	createModuleLogger,
	ModuleLogger,
	RgbColor,
	parseColor,
} from '@companion-surface/base'
import type { HIDAsync } from 'node-hid'
import { COLUMNS, createControlId, parseControlId, ROWS } from './util.js'

export class MystrixWrapper implements SurfaceInstance {
	readonly #logger: ModuleLogger

	readonly #device: HIDAsync

	readonly #surfaceId: string
	readonly #context: SurfaceContext

	/**
	 * Last drawn colours, to allow resending when app launched or other off sync situations
	 */
	#lastColours: RgbColor[][] = []

	/**
	 * Device is active or not
	 */
	#deviceActive: boolean = false

	public get surfaceId(): string {
		return this.#surfaceId
	}
	public get productName(): string {
		return '203 Systems Mystrix'
	}

	public constructor(surfaceId: string, device: HIDAsync, context: SurfaceContext) {
		this.#logger = createModuleLogger(`Instance/${surfaceId}`)
		this.#device = device
		this.#surfaceId = surfaceId
		this.#context = context

		this.#device.on('error', (error) => {
			this.#logger.error(error)
			this.#context.disconnect(error)
		})

		this.#device.on('data', (data) => {
			if (data[0] === 0xff && data[1] === 0x01) {
				if (data[2] == 1) {
					this.#deviceActive = true
					this.#refreshPanel().catch((e) => {
						this.#logger.error(`Failed to refresh panel: ${e}`)
					})
				} else {
					this.#deviceActive = false
				}
			} else if (data[0] === 0xff && data[1] === 0x10) {
				const x = data[2]
				const y = data[3]

				if (data[4] > 0) {
					this.#context.keyDownById(createControlId(x, y))
				} else {
					this.#context.keyUpById(createControlId(x, y))
				}
			}
		})
	}

	async init(): Promise<void> {
		// Start with blanking it
		await this.#inquiryActive()
		await this.blank()
	}
	async close(): Promise<void> {
		await this.blank().catch(() => null)

		this.#device.close().catch(() => null)
	}

	updateCapabilities(_capabilities: HostCapabilities): void {
		// Not used
	}

	async ready(): Promise<void> {
		// Nothing to do
	}

	async setBrightness(percent: number): Promise<void> {
		this.#updateBrightness(percent)
	}
	async blank(): Promise<void> {
		this.#lastColours = Array.from({ length: ROWS }, () =>
			Array.from({ length: COLUMNS }, () => ({ r: 0, g: 0, b: 0 })),
		)

		if (!this.#deviceActive) return

		await this.#device.write([0xff, 0x21])
	}
	async draw(_signal: AbortSignal, drawProps: SurfaceDrawProps): Promise<void> {
		const color: RgbColor = drawProps.color ? parseColor(drawProps.color) : { r: 0, g: 0, b: 0 }

		const { x, y } = parseControlId(drawProps.controlId)

		await this.#writeKeyColour(x, y, color)
	}
	async showStatus(_signal: AbortSignal, _cardGenerator: CardGenerator): Promise<void> {
		// Not used
	}

	async #refreshPanel(): Promise<void> {
		// Clear the panel first
		await this.#device.write([0xff, 0x21])

		for (let y = 0; y < ROWS; y++) {
			for (let x = 0; x < COLUMNS; x++) {
				const color = this.#lastColours[x][y]
				if (color.r == 0 && color.g == 0 && color.b == 0) {
					continue
				}
				await this.#writeKeyColour(x, y, color, true)
			}
		}
	}

	async #writeKeyColour(x: number, y: number, color: RgbColor, forced = false): Promise<void> {
		if (!this.#deviceActive) {
			return
		}

		const lastColor = this.#lastColours[x][y]

		if (!forced && color.r == lastColor.r && color.g == lastColor.g && color.b == lastColor.b) {
			return
		}

		this.#lastColours[x][y] = color

		await this.#device.write([0xff, 0x20, x, y, color.r, color.g, color.b]).catch((e) => {
			this.#logger.error(`Failed to set key color: ${e}`)
		})
	}

	#updateBrightness(brightness: number): void {
		this.#device.write([0xff, 0x30, brightness]).catch((e) => {
			this.#logger.error(`Failed to set brightness: ${e}`)
		})
	}

	async #inquiryActive(): Promise<void> {
		await this.#device.write([0xff, 0x01])
	}
}
