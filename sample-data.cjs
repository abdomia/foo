const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const lessons = await p.lesson.findMany({
    select: { id: true, title: true, grade: true, type: true, duration: true, accessType: true, topicId: true, order: true },
    orderBy: { order: 'asc' },
  });
  const topics = await p.topic.findMany({ select: { id: true, title: true, grade: true, order: true }, orderBy: { order: 'asc' } });
  const users = await p.user.findMany({ select: { grade: true }, distinct: ['grade'], where: { grade: { not: null } } });
  console.log('LESSON COUNT:', lessons.length);
  console.log('GRADES in lessons:', JSON.stringify([...new Set(lessons.map((l) => l.grade))]));
  console.log('TYPES in lessons:', JSON.stringify([...new Set(lessons.map((l) => l.type))]));
  console.log('DURATIONS sample:', JSON.stringify(lessons.slice(0, 25).map((l) => l.duration)));
  console.log('ACCESS:', JSON.stringify([...new Set(lessons.map((l) => l.accessType))]));
  console.log('TOPICS:', JSON.stringify(topics.map((t) => ({ title: t.title, grade: t.grade, order: t.order, lessons: lessons.filter((l) => l.topicId === t.id).length }))));
  console.log('USER GRADES:', JSON.stringify(users));
  await p.$disconnect();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
