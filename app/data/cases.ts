export const casesData = {
  'airflow-pro-atx': {
    id: '1',
    slug: 'corsair-4000D',
    name: 'CORSAIR 4000D AIRFLOW Tempered Glass Mid-Tower ATX Case',
    price: 149.99,
    image: '/images/Corsair4000D.jpg',
    model3D: 'Corsair4000D-3D',
    description: 'High-airflow ATX case with mesh front panel and tempered glass side panel',
    category: 'ATX',
    features: [
      'Mesh front panel for optimal airflow',
      'Tempered glass side panel',
      'Support for up to 360mm radiator',
      'Tool-less design',
      'USB 3.0 Type-C front panel connector'
    ],
    specifications: {
      dimensions: '450mm x 210mm x 480mm',
      weight: '8.5 kg',
      formFactor: 'ATX, Micro-ATX, Mini-ITX',
      maxGPULength: '380mm',
      maxCPUCoolerHeight: '170mm',
      includedFans: '3x 120mm RGB fans'
    }
  },
  'compact-itx': {
    id: '2',
    slug: 'compact-itx',
    name: 'Compact ITX',
    price: 99.99,
    image: '/cases/itx-case.jpg',
    model3D: 'CompactITX-3D',
    description: 'Minimalist ITX case perfect for small form factor builds',
    category: 'ITX',
    features: [
      'Compact design',
      'Premium aluminum construction',
      'Support for dual-slot GPU',
      'Efficient cable management',
      'Low noise optimization'
    ],
    specifications: {
      dimensions: '280mm x 140mm x 330mm',
      weight: '4.2 kg',
      formFactor: 'Mini-ITX',
      maxGPULength: '300mm',
      maxCPUCoolerHeight: '130mm',
      includedFans: '2x 120mm fans'
    }
  }
} as const

export type CaseData = typeof casesData 