import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Categorías base del marketplace
  const categories = [
    { name: 'Scalping', slug: 'scalping', description: 'Bots de alta frecuencia, operaciones cortas' },
    { name: 'Swing Trading', slug: 'swing-trading', description: 'Operaciones de medio plazo' },
    { name: 'Grid Trading', slug: 'grid-trading', description: 'Estrategias de cuadrícula de precios' },
    { name: 'Trend Following', slug: 'trend-following', description: 'Seguimiento de tendencias' },
    { name: 'Mean Reversion', slug: 'mean-reversion', description: 'Reversión a la media' },
    { name: 'News Trading', slug: 'news-trading', description: 'Trading en eventos de noticias' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      create: cat,
      update: {},
    });
  }

  console.log('✅ Seed completado: categorías creadas');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
