import areaRaw from '../../../../data/area.json';
import nameSeedsRaw from '../../../../data/chinese-name-seeds.json';

export interface AreaNode {
  id: string;
  name: string;
  parentID: string | null;
  level: 1 | 2 | 3;
  children: AreaNode[];
}

export interface FlatCounty {
  /** 6-digit GB/T 2260 administrative region code (county level). */
  id: string;
  /** County / district name, e.g. "朝阳区". */
  name: string;
  cityId: string;
  cityName: string;
  provinceId: string;
  provinceName: string;
}

interface AreaPayload {
  data: AreaNode[];
}

interface NameSeedPayload {
  data: {
    surnames: string[];
    givenNames: string[];
    names: string[];
  };
}

const areaPayload = areaRaw as AreaPayload;
const nameSeedPayload = nameSeedsRaw as NameSeedPayload;

/** All provinces / municipalities at the top of the tree. */
export const PROVINCES: ReadonlyArray<AreaNode> = areaPayload.data;

/**
 * Flat index of every county-level (level-3) area, joined with its city
 * and province so the renderer can show "省 / 市 / 县" labels and the
 * generator can derive the 6-digit ID prefix in one shot.
 *
 * Districts that lack a level-3 child (data quality holes — a few small
 * county-level cities live straight under the province as level-2) are
 * skipped here; the renderer falls back to the global pool when a region
 * filter narrows down to an empty set.
 */
export const ALL_COUNTIES: ReadonlyArray<FlatCounty> = (() => {
  const counties: FlatCounty[] = [];
  for (const province of areaPayload.data) {
    for (const city of province.children) {
      for (const county of city.children) {
        counties.push({
          id: county.id,
          name: county.name,
          cityId: city.id,
          cityName: city.name,
          provinceId: province.id,
          provinceName: province.name,
        });
      }
    }
  }
  return counties;
})();

/** All pre-combined Chinese names (surname + givenName) from the seed file. */
export const ALL_NAMES: ReadonlyArray<string> = nameSeedPayload.data.names;
