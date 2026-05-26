import { db, makeId, nowIso, parseJson } from '../server/db/database.js';

const rawItems = `
Smithfield lead zinc massive sulphides
Dunbrack ore (lead copper zinc sulphides)
New Ross Molybdenite
New Ross Granite (Might contain cassiterite)
Walton Rocks (Unidentified high density)
Clean quartz (Collected for silicon thermite)
Amethyst Cove (Amethyst jewelry material + high grade magnetite)
Vancouver coal sample
Copper Mountain Chalcopyrite (Could use to make sulfur)
15mm Steel Plate
25.7mm Steel Square Stock
33.5mm Diameter Steel Pipe
Steel Angle
22.1mm diameter PVC
15.9mm Diameter PVC
Brass Lock Nuts x 5 (Used to make rings)
60.5mm Diameter PVC
Cut Off Disks
Cutting Oil
Super Glue
Wood Glue
Starbond Water Thin Glue
Sanding Belts (60, 80, 120, 220 grit)
Belt Sander
Sand (Casting)
Tap and Die Set
Bench Grinder
Router Bit Set
Buffing/Polishing Kit
500W Inverter
Respirator
Nut and Bolt Extractor Sockets
"Bone" Plastic Inlay Material
Assorted Gemstones for Jewelry
Lobster Clasp
0.040" Spiral Downcut Bit
1/8" Spiral Downcut Bit
Box Filigree Clasp
5mm Gold Finish Chain
Chip Solder
Self Pickling Liquid Flux
Blanc Compound
Hand File Set
Very Small Chisel
Hand Graver
Jewelers Saw Blades
Plastic Ring Mandrel
1lb spool of 2mm Diameter Brass Wire
Dental Picks
Wax Tubes
21m of 28 Gauge Gold Colored Wire
5 4.1mm Diameter Square HSS Blanks
Diamond Dremel Bit Set
Carbide Dremel Burr
Propane Melting Furnace
Shaker Table
Garage Door Opener (To Be Salvaged)
Hand Rock Crusher
Battery Acid
Distilled Water
Small Pickaxe
Gold Pan
95% Ethanol
99% Isopropanol
Casting Resin
Casting Hardener
Black Pigment Powder
Bronze Pigment Powder
Sulfur
Xylene
Crushed Quartz
Sulfur Xylene Mixture
10% Acetic Acid
232 Degree Celsius Silicone Sealant
2.53kg Lead
2.33kg Wrought Aluminum
1.6mm Aluminum Flexure
28.12kg Cast Aluminum
0.96kg Brass
1.03kg Unknown Aluminum Bronze Alloy
Plunge Router Base
Graphite Crucible
Gasket Material
Solvex Chemical Resistant Gloves
Thermal Gloves
Tongs
Barbecue Lighters
3x Muffin Pans
10"x14" Glass Plate
2x Steel Cups (Used for High Temp Reactions)
4x Baking Trays
1mm Brass Sheet
Coffee Grinder (Used for Making Aluminum Powder)
Concrete Mixer Drill Bit
Fine Sieve
Beer Hydrometer
Test Tube Rack with Dirty Test Tubes
Dry Wall Mud (Used as a Casting Refractory)
Steel Casting Containers
Braided Steel Wire
Printer Ink Reservoir + Tubes
Long Chain from Garage Door
3/8" Ball Valve
5.9mm Diameter Steel Rod
9.5mm Diameter Steel Rod
Capillary Thermostat
Convection Oven Motor
Assorted DC Motors
Convection Oven Heating Element
33.5mm Diameter Steel Nipple
33mm Steel Pipe
26.8mm Steel Pipe
Convection Oven Fan Blade
1 1/2" Swivel Pulley
2x Hose Clamps
Many Assorted Springs
Sheet Metal Scraps
Bucket of Clay
Bucket of Fire Bricks
Dismantled Tecumseh Snowblower Engine (Forgotten Rebuild Project)
15cm Diameter Aluminum Shaft From old Drum Sander
0.73kg Stripped Copper Wire
Misc Salvaged Wires
Dishwasher Solenoid Water Valve
Dishwasher Selector Switch Stack
Pressure Switch
Heating Element
Solenoid Valve
Dishwasher Blower
Beakers (50, 100, 250, 400, 600mL)
Ceramic Filter Funnel
Magnesium Strip
Nickel Acetate
Syringes (5, 10mL)
Hot Plate / Magnetic Stirrer
Bunsen Burner Stand
Glass Funnel
Erlenmeyer Flask 250mL
25mL Graduated Pipette
Bubbling Adapter
Small U-Tube
Stopcock U-Tube
Watch Glasses
MnO2 Powder
Test Tube Stoppers
Assorted Test Tubes
`;

function normalizeTag(tag) {
  return tag
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function addTags(tags, ...nextTags) {
  const seen = new Set(tags.map(normalizeTag));
  for (const tag of nextTags.flat()) {
    const normalized = normalizeTag(String(tag || ''));
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    tags.push(normalized);
  }
}

function parseQuantity(name) {
  const prefix = name.match(/^(\d+)\s*x\s+/i);
  const suffix = name.match(/\bx\s*(\d+)\b/i);
  const weight = name.match(/^(\d+(?:\.\d+)?)\s*kg\b/i);
  const length = name.match(/^(\d+(?:\.\d+)?)\s*m\b/i);
  if (prefix) return { quantity: Number(prefix[1]), units: 'each' };
  if (suffix) return { quantity: Number(suffix[1]), units: 'each' };
  if (weight) return { quantity: Number(weight[1]), units: 'kg' };
  if (length) return { quantity: Number(length[1]), units: 'm' };
  return { quantity: 1, units: 'each' };
}

function parseDimensions(name) {
  const dimensions = {};
  const mmDiameter = name.match(/(\d+(?:\.\d+)?)\s*mm\s+diameter/i) || name.match(/(\d+(?:\.\d+)?)\s*mm\s+Diameter/i);
  const mmLeading = name.match(/^(\d+(?:\.\d+)?)\s*mm\b/i);
  const cmDiameter = name.match(/(\d+(?:\.\d+)?)\s*cm\s+Diameter/i);
  const inchPlate = name.match(/(\d+(?:\s+\d+\/\d+)?|\d+\/\d+)"(?:x(\d+(?:\.\d+)?))?/i);
  const gauge = name.match(/(\d+)\s*Gauge/i);
  if (mmDiameter) dimensions.diameter = { value: Number(mmDiameter[1]), unit: 'mm' };
  if (cmDiameter) dimensions.diameter = { value: Number(cmDiameter[1]), unit: 'cm' };
  if (mmLeading && /plate|sheet|flexure/i.test(name)) dimensions.thickness = { value: Number(mmLeading[1]), unit: 'mm' };
  if (gauge) dimensions.gauge = { value: Number(gauge[1]), unit: 'AWG' };
  if (inchPlate && /glass plate/i.test(name)) {
    dimensions.width = { value: Number(inchPlate[1]), unit: 'in' };
    dimensions.length = { value: Number(inchPlate[2]), unit: 'in' };
  }
  return dimensions;
}

function classify(name) {
  const lower = name.toLowerCase();
  const tags = [];
  const attributes = {};
  let base_type = 'unknown';
  let category = 'general';
  let condition = 'unknown';
  let salvage_status = 'stored';
  let confidence_level = 'medium';
  let tested_status = 'not tested';
  let notes = '';
  let source_origin = '';
  let material_composition = [];

  if (/smithfield|dunbrack|new ross|walton|amethyst cove|vancouver|copper mountain|quartz|chalcopyrite|molybdenite|granite|coal sample|rocks/.test(lower)) {
    base_type = 'mineral sample';
    category = 'geology';
    addTags(tags, 'mineral-sample', 'geology', 'ore', 'metallurgy', 'assay');
    if (/smithfield/.test(lower)) source_origin = 'Smithfield';
    if (/dunbrack/.test(lower)) source_origin = 'Dunbrack';
    if (/new ross/.test(lower)) source_origin = 'New Ross';
    if (/walton/.test(lower)) source_origin = 'Walton';
    if (/amethyst cove/.test(lower)) source_origin = 'Amethyst Cove';
    if (/vancouver/.test(lower)) source_origin = 'Vancouver';
    if (/copper mountain/.test(lower)) source_origin = 'Copper Mountain';
    if (/lead/.test(lower)) addTags(tags, 'lead');
    if (/zinc/.test(lower)) addTags(tags, 'zinc');
    if (/copper/.test(lower)) addTags(tags, 'copper');
    if (/sulphide|sulfide/.test(lower)) addTags(tags, 'sulphide', 'sulfur-source');
    if (/molybdenite/.test(lower)) addTags(tags, 'molybdenite', 'molybdenum');
    if (/granite/.test(lower)) addTags(tags, 'granite');
    if (/cassiterite/.test(lower)) addTags(tags, 'cassiterite', 'tin-potential');
    if (/high density/.test(lower)) addTags(tags, 'high-density', 'to-identify');
    if (/quartz/.test(lower)) addTags(tags, 'quartz', 'silica', 'silicon-thermite');
    if (/amethyst/.test(lower)) addTags(tags, 'amethyst', 'jewelry');
    if (/magnetite/.test(lower)) addTags(tags, 'magnetite', 'iron-oxide');
    if (/coal/.test(lower)) addTags(tags, 'coal', 'carbon');
    if (/chalcopyrite/.test(lower)) addTags(tags, 'chalcopyrite', 'copper-ore');
    if (/unidentified|might contain|could use/.test(lower)) {
      confidence_level = 'low';
      salvage_status = 'to identify';
    }
  }

  if (/steel|brass|aluminum|aluminium|lead|copper wire|hss|chain|springs|sheet metal|pipe|rod|plate|stock|angle|nipple/.test(lower)) {
    if (base_type !== 'mineral sample') {
      base_type = /wire/.test(lower) ? 'wire' : 'raw stock';
      category = 'materials';
      addTags(tags, 'raw-stock', 'metal', 'fabrication');
    }
    if (/steel|hss/.test(lower)) {
      addTags(tags, 'steel', /hss/.test(lower) ? 'hss' : '');
      material_composition.push('steel');
    }
    if (/brass/.test(lower)) {
      addTags(tags, 'brass', 'copper-alloy');
      material_composition.push('brass');
    }
    if (/aluminum|aluminium/.test(lower)) {
      addTags(tags, 'aluminum', /cast aluminum/.test(lower) ? 'cast-aluminum' : '', /wrought/.test(lower) ? 'wrought-aluminum' : '');
      material_composition.push('aluminum');
    }
    if (/lead/.test(lower)) {
      addTags(tags, 'lead', 'dense-metal');
      material_composition.push('lead');
    }
    if (/copper/.test(lower)) {
      addTags(tags, 'copper', 'conductive');
      material_composition.push('copper');
    }
    if (/pipe|nipple/.test(lower)) addTags(tags, 'pipe');
    if (/rod|shaft/.test(lower)) addTags(tags, 'rod', 'shaft');
    if (/plate|sheet/.test(lower)) addTags(tags, 'sheet', 'plate');
    if (/wire/.test(lower)) addTags(tags, 'wire', 'electrical');
    if (/scrap|salvaged|garage door|old drum sander/.test(lower)) addTags(tags, 'salvaged');
  }

  if (/pvc|plastic|bone|wax|resin|hardener|silicone|gasket/.test(lower)) {
    base_type = 'polymer material';
    category = 'materials';
    addTags(tags, 'polymer', 'nonmetal');
    if (/pvc/.test(lower)) {
      addTags(tags, 'pvc', 'pipe');
      material_composition.push('PVC');
    }
    if (/plastic|bone/.test(lower)) addTags(tags, 'plastic', 'inlay', 'jewelry');
    if (/wax/.test(lower)) addTags(tags, 'wax', 'casting');
    if (/resin|hardener/.test(lower)) addTags(tags, 'resin-casting');
    if (/silicone/.test(lower)) addTags(tags, 'silicone', 'sealant', 'heat-resistant');
    if (/gasket/.test(lower)) addTags(tags, 'gasket', 'seal');
  }

  if (/acid|water|ethanol|isopropanol|xylene|sulfur|acetate|mno2|flux|oil|glue|compound|pigment|battery acid/.test(lower)) {
    base_type = 'chemical';
    category = 'chemistry';
    addTags(tags, 'chemical');
    if (/ethanol|isopropanol|xylene/.test(lower)) addTags(tags, 'solvent', 'flammable');
    if (/acid|acetic/.test(lower)) addTags(tags, 'acid', 'corrosive');
    if (/battery acid/.test(lower)) addTags(tags, 'sulfuric-acid');
    if (/water/.test(lower)) addTags(tags, 'water', 'lab-supply');
    if (/sulfur/.test(lower)) addTags(tags, 'sulfur');
    if (/xylene/.test(lower)) addTags(tags, 'xylene');
    if (/acetate/.test(lower)) addTags(tags, 'nickel', 'plating');
    if (/mno2/.test(lower)) addTags(tags, 'manganese-dioxide', 'oxidizer');
    if (/flux|solder/.test(lower)) addTags(tags, 'soldering', 'jewelry');
    if (/oil/.test(lower)) addTags(tags, 'lubricant', 'machining');
    if (/glue|adhesive/.test(lower)) addTags(tags, 'adhesive');
    if (/pigment/.test(lower)) addTags(tags, 'pigment', 'casting');
  }

  if (/sander|grinder|router|tap and die|file|chisel|graver|saw blades|dremel|furnace|shaker table|crusher|pickaxe|gold pan|tongs|hydrometer|hot plate|bunsen/.test(lower)) {
    base_type = 'tool';
    category = 'tools';
    addTags(tags, 'tool');
    if (/furnace|crucible|tongs/.test(lower)) addTags(tags, 'foundry', 'high-temperature', 'casting');
    if (/sander|grinder|router|dremel|file|chisel|graver|saw/.test(lower)) addTags(tags, 'machining', 'woodworking', 'jewelry');
    if (/shaker table|crusher|pickaxe|gold pan/.test(lower)) addTags(tags, 'ore-processing', 'prospecting');
    if (/hot plate|bunsen|hydrometer/.test(lower)) addTags(tags, 'lab-equipment', 'chemistry');
  }

  if (/inverter|motor|heating element|thermostat|solenoid|switch|pressure switch|blower|fan blade|valve|printer ink|garage door opener|dishwasher|oven/.test(lower)) {
    base_type = 'component';
    category = 'salvage';
    addTags(tags, 'salvage', 'component');
    if (/motor|blower|fan/.test(lower)) addTags(tags, 'motor', /dc motor/.test(lower) ? 'dc-motor' : '', 'electromechanical');
    if (/heating element/.test(lower)) addTags(tags, 'heating', 'thermal', 'resistive-heater');
    if (/solenoid|valve/.test(lower)) addTags(tags, 'valve', 'solenoid', 'fluid-control');
    if (/switch|thermostat/.test(lower)) addTags(tags, 'switch', 'control');
    if (/inverter/.test(lower)) addTags(tags, 'power-electronics', 'ac-power');
    if (/garage door opener|dismantled|to be salvaged/.test(lower)) salvage_status = 'to disassemble';
  }

  if (/beaker|funnel|flask|pipette|u-tube|watch glass|test tube|syringe|adapter|stopcock|rack/.test(lower)) {
    base_type = 'labware';
    category = 'chemistry';
    addTags(tags, 'labware', 'chemistry');
    if (/glass|beaker|flask|pipette|tube|watch/.test(lower)) addTags(tags, 'glassware');
    if (/ceramic/.test(lower)) addTags(tags, 'ceramic');
    if (/dirty/.test(lower)) {
      condition = 'dirty';
      addTags(tags, 'needs-cleaning');
    }
  }

  if (/respirator|gloves/.test(lower)) {
    base_type = 'safety equipment';
    category = 'safety';
    addTags(tags, 'safety', 'ppe');
    if (/chemical/.test(lower)) addTags(tags, 'chemical-resistant');
    if (/thermal/.test(lower)) addTags(tags, 'heat-resistant', 'high-temperature');
  }

  if (/clasp|chain|gemstone|ring|mandrel|jewelers|jewelry|filigree|brass wire|gold colored wire/.test(lower)) {
    addTags(tags, 'jewelry');
    if (category === 'general') category = 'jewelry';
  }

  if (/casting|muffin|baking tray|crucible|fire brick|refractory|dry wall mud|sand/.test(lower)) {
    addTags(tags, 'casting', 'foundry');
    if (category === 'general') category = 'foundry';
  }

  if (/wood glue|router|downcut|sander/.test(lower)) addTags(tags, 'woodworking');
  if (/conductive|wire|motor|inverter|switch|solenoid|heating element/.test(lower)) addTags(tags, 'electronics');
  if (/unknown|unidentified|forgotten/.test(lower)) confidence_level = 'low';
  if (/forgotten rebuild project/.test(lower)) {
    salvage_status = 'to identify';
    addTags(tags, 'project', 'incomplete');
  }
  if (tags.length === 0) addTags(tags, 'workshop');

  if (base_type === 'unknown') {
    if (/set|kit|sockets|belts|disks/.test(lower)) {
      base_type = 'tooling';
      category = 'tools';
      addTags(tags, 'tooling');
    } else {
      base_type = 'material';
    }
  }

  if (/\((.+)\)/.test(name)) {
    notes = name.match(/\((.+)\)/)[1];
  }

  return {
    base_type,
    category,
    tags,
    attributes,
    dimensions: parseDimensions(name),
    material_composition,
    condition,
    source_origin,
    tested_status,
    confidence_level,
    salvage_status,
    notes
  };
}

function refreshTagRegistry() {
  const counts = new Map();
  const rows = db.prepare('SELECT tags FROM inventory_items').all();
  for (const row of rows) {
    for (const tag of parseJson(row.tags, [])) {
      const normalized = normalizeTag(tag);
      if (!normalized) continue;
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }
  }
  const now = nowIso();
  const upsert = db.prepare(`INSERT INTO tags (id, name, normalized_name, use_count, created_at, updated_at)
    VALUES (@id, @name, @normalized_name, @use_count, @created_at, @updated_at)
    ON CONFLICT(normalized_name) DO UPDATE SET name=@name, use_count=@use_count, updated_at=@updated_at`);
  for (const [tag, count] of counts) {
    upsert.run({
      id: makeId('tag'),
      name: tag,
      normalized_name: tag,
      use_count: count,
      created_at: now,
      updated_at: now
    });
  }
}

const insert = db.prepare(`INSERT INTO inventory_items
  (id, name, base_type, category, tags, attributes, quantity, units, dimensions, material_composition, condition, location_id, notes, photos, source_origin, tested_status, confidence_level, salvage_status, date_added, created_at, updated_at)
  VALUES (@id, @name, @base_type, @category, @tags, @attributes, @quantity, @units, @dimensions, @material_composition, @condition, NULL, @notes, '[]', @source_origin, @tested_status, @confidence_level, @salvage_status, @date_added, @created_at, @updated_at)`);

const update = db.prepare(`UPDATE inventory_items SET
  name=@name, base_type=@base_type, category=@category, tags=@tags, attributes=@attributes, quantity=@quantity, units=@units,
  dimensions=@dimensions, material_composition=@material_composition, condition=@condition, notes=@notes, source_origin=@source_origin,
  tested_status=@tested_status, confidence_level=@confidence_level, salvage_status=@salvage_status, date_added=@date_added,
  created_at=@created_at, updated_at=@updated_at
  WHERE id=@id`);

const findByName = db.prepare('SELECT id FROM inventory_items WHERE name = ? ORDER BY created_at LIMIT 1');

let inserted = 0;
let updated = 0;
const now = nowIso();
const dateAdded = now.slice(0, 10);

db.exec('BEGIN');
try {
  for (const name of rawItems.split('\n').map((line) => line.trim()).filter(Boolean)) {
    const classified = classify(name);
    const quantity = parseQuantity(name);
    const existing = findByName.get(name);
    const row = {
      id: existing?.id || makeId('item'),
      name,
      ...classified,
      ...quantity,
      tags: JSON.stringify(classified.tags),
      attributes: JSON.stringify(classified.attributes),
      dimensions: JSON.stringify(classified.dimensions),
      material_composition: JSON.stringify(classified.material_composition),
      date_added: dateAdded,
      created_at: now,
      updated_at: now
    };
    if (existing) {
      update.run(row);
      updated += 1;
    } else {
      insert.run(row);
      inserted += 1;
    }
  }
  refreshTagRegistry();
  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}

console.log(JSON.stringify({ inserted, updated, total: inserted + updated }, null, 2));
