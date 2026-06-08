const e12Bases = ['1', '1.2', '1.5', '1.8', '2.2', '2.7', '3.3', '3.9', '4.7', '5.6', '6.8', '8.2'];
const resistorUnits = ['ohm', '10 ohm', '100 ohm', 'k ohm', '10k ohm', '100k ohm', 'M ohm'];

function resistorValue(base, unit) {
  if (unit === 'ohm') return `${base} ohm`;
  if (unit === '10 ohm') return `${Math.round(Number(base) * 10)} ohm`;
  if (unit === '100 ohm') return `${Math.round(Number(base) * 100)} ohm`;
  if (unit === 'k ohm') return `${base}k ohm`;
  if (unit === '10k ohm') return `${Math.round(Number(base) * 10)}k ohm`;
  if (unit === '100k ohm') return `${Math.round(Number(base) * 100)}k ohm`;
  return `${base}M ohm`;
}

export const electronicsDefaults = {
  Resistors: resistorUnits.flatMap((unit) => e12Bases.map((base) => resistorValue(base, unit))),
  'Ceramic Capacitors': [
    '10pF', '22pF', '33pF', '47pF', '68pF', '100pF', '220pF', '330pF', '470pF',
    '1nF', '2.2nF', '4.7nF', '10nF', '22nF', '47nF', '100nF', '220nF', '470nF',
    '1uF', '2.2uF', '4.7uF', '10uF'
  ],
  'Electrolytic Capacitors': ['1uF', '2.2uF', '4.7uF', '10uF', '22uF', '47uF', '100uF', '220uF', '470uF', '1000uF', '2200uF', '4700uF'],
  'Film Capacitors': ['1nF', '10nF', '47nF', '100nF', '220nF', '470nF', '1uF', '2.2uF'],
  Inductors: ['1uH', '2.2uH', '4.7uH', '10uH', '22uH', '47uH', '100uH', '220uH', '470uH', '1mH', '10mH'],
  Diodes: ['1N4148', '1N4001', '1N4004', '1N4007', '1N5819', '1N5822', 'Zener 3.3V', 'Zener 5.1V', 'Zener 12V', 'Bridge Rectifier', 'TVS Diode', 'MOV'],
  LEDs: ['Red 3mm', 'Green 3mm', 'Blue 3mm', 'Yellow 3mm', 'White 3mm', 'Red 5mm', 'Green 5mm', 'Blue 5mm', 'Yellow 5mm', 'White 5mm', 'IR LED', 'Photodiode'],
  'Bipolar Transistors': ['2N3904', '2N3906', '2N2222', 'BC547', 'BC557', 'TIP31', 'TIP32', 'TIP120', 'TIP122'],
  MOSFETs: ['2N7000', 'BS170', 'IRF540', 'IRF9540', 'IRFZ44N', 'IRLZ44N', 'Generic N-Channel MOSFET', 'Generic P-Channel MOSFET'],
  'Voltage Regulators': ['7805', '7812', 'LM317', 'LM1117-3.3', 'Buck Converter IC', 'Boost Converter IC'],
  Comparators: ['LM393', 'LM339', 'Generic Comparator'],
  'Operational Amplifiers': ['LM358', 'LM324', 'TL072', 'TL074', 'Generic Op Amp'],
  'Timer ICs': ['NE555', '556'],
  'Logic ICs': ['74HC00', '74HC04', '74HC08', '74HC14', '74HC74', '74HC595', 'Generic Logic IC'],
  'Memory ICs': ['24C01', '24C02', '24C04', '24C64', 'EEPROM', 'Flash Memory'],
  Microcontrollers: ['ATmega328P', 'ATtiny85', 'PIC16 Series', 'STM32', 'ESP32', 'Generic MCU'],
  Relays: ['5V Relay', '12V Relay', '24V Relay', 'Solid State Relay'],
  Switches: ['Push Button', 'Toggle Switch', 'Limit Switch', 'Rotary Switch', 'Reed Switch'],
  Connectors: ['Header Pins', 'Terminal Block', 'DC Barrel Jack', 'USB-A', 'USB-C', 'Micro USB', 'RJ45', 'Ribbon Cable Connector'],
  Sensors: ['Thermistor', 'Hall Sensor', 'Photoresistor', 'Phototransistor', 'IR Receiver', 'Microphone', 'Accelerometer', 'Generic Sensor'],
  Displays: ['16x2 LCD', '20x4 LCD', 'Character LCD', 'OLED Display', 'TFT Display', 'Seven Segment Display', 'Generic Display'],
  Modules: ['Breadboard', 'Buck Converter Module', 'Boost Converter Module', 'Relay Module', 'Motor Driver', 'Stepper Driver', 'Logic Analyzer', 'USB UART Adapter']
};

export function seededElectronicsStock(savedStock = {}) {
  const stock = {};
  for (const [type, values] of Object.entries(electronicsDefaults)) {
    stock[type] = {};
    for (const value of values) stock[type][value] = Boolean(savedStock?.[type]?.[value]);
    for (const [value, inStock] of Object.entries(savedStock?.[type] || {})) stock[type][value] = Boolean(inStock);
  }
  for (const [type, values] of Object.entries(savedStock || {})) {
    if (!stock[type]) stock[type] = Object.fromEntries(Object.entries(values || {}).map(([value, inStock]) => [value, Boolean(inStock)]));
  }
  return stock;
}
