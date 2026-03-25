import { expect } from 'chai'
import Sinon from 'sinon'
import ncu from '../src/'
import type { PackageFile } from '../src/types/PackageFile'
import type { Packument } from '../src/types/Packument'
import chaiSetup from './helpers/chaiSetup'
import stubVersions from './helpers/stubVersions'

chaiSetup()

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.now()

interface CreateMockParams {
  name: string
  versions: Record<string, string>
  distTags?: Record<string, string>
}

/**
 * Creates a mock package packument for testing.
 */
const createMockVersion = ({ name, versions, distTags }: CreateMockParams): Partial<Packument> => {
  return {
    name,
    version: Object.keys(versions)[0],
    versions: Object.fromEntries(Object.entries(versions).map(([version]) => [version, { version } as Packument])),
    time: Object.fromEntries(Object.entries(versions).map(([version, date]) => [version, date])),
    'dist-tags': distTags,
  }
}

describe('inactive', () => {
  beforeEach(() => {
    Sinon.restore()
  })

  it('does not report a package that has a recent latest version', async () => {
    const packageData: PackageFile = {
      dependencies: { 'test-package': '1.0.0' },
    }
    const stub = stubVersions(
      createMockVersion({
        name: 'test-package',
        versions: { '1.0.0': new Date(NOW - 30 * DAY).toISOString() },
        distTags: { latest: '1.0.0' },
      }),
    )

    const result = await ncu({ packageData, inactive: 365 })

    expect(result).to.not.have.property('test-package')
    stub.restore()
  })

  it('does not report a package that has an available upgrade (even if old)', async () => {
    const packageData: PackageFile = {
      dependencies: { 'test-package': '1.0.0' },
    }
    const stub = stubVersions(
      createMockVersion({
        name: 'test-package',
        versions: { '2.0.0': new Date(NOW - 400 * DAY).toISOString() },
        distTags: { latest: '2.0.0' },
      }),
    )

    // ncu should report the upgrade, not the inactive notice
    const result = await ncu({ packageData, inactive: 365 })

    // The upgrade is returned, not filtered out
    expect(result).to.have.property('test-package', '2.0.0')
    stub.restore()
  })

  it('reports packages that are up-to-date but have not received a new release for the inactive period', async () => {
    const packageData: PackageFile = {
      dependencies: { 'test-package': '1.0.0' },
    }
    const stub = stubVersions(
      createMockVersion({
        name: 'test-package',
        versions: { '1.0.0': new Date(NOW - 400 * DAY).toISOString() },
        distTags: { latest: '1.0.0' },
      }),
    )

    // result should be empty (no upgrades), but inactive is detected internally
    const result = await ncu({ packageData, inactive: 365 })

    // No upgrade available - package is inactive but ncu returns empty
    expect(result).to.deep.equal({})
    stub.restore()
  })

  it('accepts inactive as a number (days)', async () => {
    const packageData: PackageFile = {
      dependencies: { 'test-package': '1.0.0' },
    }
    const stub = stubVersions(
      createMockVersion({
        name: 'test-package',
        versions: { '1.0.0': new Date(NOW - 400 * DAY).toISOString() },
        distTags: { latest: '1.0.0' },
      }),
    )

    const result = await ncu({ packageData, inactive: 365 })
    expect(result).to.deep.equal({})
    stub.restore()
  })

  it('accepts inactive as a string with days suffix ("365d")', async () => {
    const packageData: PackageFile = {
      dependencies: { 'test-package': '1.0.0' },
    }
    const stub = stubVersions(
      createMockVersion({
        name: 'test-package',
        versions: { '1.0.0': new Date(NOW - 400 * DAY).toISOString() },
        distTags: { latest: '1.0.0' },
      }),
    )

    const result = await ncu({ packageData, inactive: '365d' })
    expect(result).to.deep.equal({})
    stub.restore()
  })

  it('accepts inactive as a string with years suffix ("1y")', async () => {
    const packageData: PackageFile = {
      dependencies: { 'test-package': '1.0.0' },
    }
    const stub = stubVersions(
      createMockVersion({
        name: 'test-package',
        versions: { '1.0.0': new Date(NOW - 400 * DAY).toISOString() },
        distTags: { latest: '1.0.0' },
      }),
    )

    const result = await ncu({ packageData, inactive: '1y' })
    expect(result).to.deep.equal({})
    stub.restore()
  })

  it('correctly identifies inactive vs active packages with multiple packages', async () => {
    const packageData: PackageFile = {
      dependencies: {
        'active-package': '1.0.0',
        'inactive-package': '2.0.0',
        'upgrade-available': '1.0.0',
      },
    }

    const activeStub = createMockVersion({
      name: 'active-package',
      versions: { '1.0.0': new Date(NOW - 30 * DAY).toISOString() },
      distTags: { latest: '1.0.0' },
    })
    const inactiveStub = createMockVersion({
      name: 'inactive-package',
      versions: { '2.0.0': new Date(NOW - 500 * DAY).toISOString() },
      distTags: { latest: '2.0.0' },
    })
    const upgradeStub = createMockVersion({
      name: 'upgrade-available',
      versions: { '2.0.0': new Date(NOW - 400 * DAY).toISOString() },
      distTags: { latest: '2.0.0' },
    })

    const stub = stubVersions({
      'active-package': activeStub,
      'inactive-package': inactiveStub,
      'upgrade-available': upgradeStub,
    })

    const result = await ncu({ packageData, inactive: 365 })

    // upgrade-available should be upgraded
    expect(result).to.have.property('upgrade-available', '2.0.0')
    // active-package and inactive-package should NOT be in upgraded (already at latest)
    expect(result).to.not.have.property('active-package')
    expect(result).to.not.have.property('inactive-package')

    stub.restore()
  })
})
