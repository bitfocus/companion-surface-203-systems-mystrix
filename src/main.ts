import {
	createModuleLogger,
	type DiscoveredSurfaceInfo,
	type HIDDevice,
	type OpenSurfaceResult,
	type SurfaceContext,
	type SurfacePlugin,
} from '@companion-surface/base'
import { MystrixWrapper } from './instance.js'
import { createSurfaceSchema } from './surface-schema.js'
import HID from 'node-hid'

const logger = createModuleLogger('Plugin')

const MystrixPlugin: SurfacePlugin<HIDDevice> = {
	init: async (): Promise<void> => {
		// Not used
	},
	destroy: async (): Promise<void> => {
		// Not used
	},

	checkSupportsHidDevice: (device: HIDDevice): DiscoveredSurfaceInfo<HIDDevice> | null => {
		if (
			device.vendorId !== 0x0203 || // 203 Systems
			(device.productId & 0xffc0) !== 0x1040 || // Mystrix
			device.usagePage !== 0xff00 || // rawhid interface
			device.usage !== 0x01
		)
			return null

		logger.debug(`Checked HID device: ${device.manufacturer} ${device.product}`)

		return {
			surfaceId: `203-mystrix:${device.serialNumber}`, // Use the faked serial number
			description: '203 Systems Mystrix',
			pluginInfo: device,
		}
	},

	openSurface: async (
		surfaceId: string,
		pluginInfo: HIDDevice,
		context: SurfaceContext,
	): Promise<OpenSurfaceResult> => {
		const device = await HID.HIDAsync.open(pluginInfo.path)
		logger.debug(`Opening ${pluginInfo.manufacturer} ${pluginInfo.product} (${surfaceId})`)

		return {
			surface: new MystrixWrapper(surfaceId, device, context),
			registerProps: {
				brightness: true,
				surfaceLayout: createSurfaceSchema(),
				pincodeMap: null,
				configFields: null,
				location: null,
			},
		}
	},
}
export default MystrixPlugin
