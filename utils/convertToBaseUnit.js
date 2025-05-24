const convertToBaseUnit = (quantity, fromUnit, toUnit) => {
  const conversion = {
    gram: {
      kg: (qty) => qty / 1000,
      pcs: (qty) => qty / 1200,
      ekor: (qty) => qty / 1200,
    },
    kg: {
      gram: (qty) => qty * 1000,
      pcs: (qty) => qty / 1.2,
      ekor: (qty) => qty / 1.2,
    },
    ml: {
      liter: (qty) => qty / 1000,
    },
    liter: {
      ml: (qty) => qty * 1000,
    },
    pcs: {
      kg: (qty) => qty * 1.2,
      gram: (qty) => qty * 1200,
      pcs: (qty) => qty,
      ekor: (qty) => qty / 10,
    },
    ekor: {
      kg: (qty) => qty * 1.2,
      gram: (qty) => qty * 1200,
      pcs: (qty) => qty * 10,
      ekor: (qty) => qty,
    },
  };
  if (fromUnit === toUnit) return quantity;
  const converter = conversion[fromUnit]?.[toUnit];
  if (!converter)
    throw new Error(`Konversi dari ${fromUnit} ke ${toUnit} tidak didukung`);
  return converter(quantity);
};

module.exports = {
  convertToBaseUnit,
};
