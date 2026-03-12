const {Lesson, sequelize} = require('../src/models');

function buildHtml(title) {
  const safeTitle = String(title || 'Farm lesson');
  return [
    `<h3>${safeTitle}</h3>`,
    '<p>This lesson explains the practical steps farmers can apply on a weekly basis.</p>',
    '<ul>',
    '<li>Set clear weekly production targets and track output.</li>',
    '<li>Record input usage (seed, fertilizer, labor, water) for cost control.</li>',
    '<li>Monitor risks early and adjust your plan before losses grow.</li>',
    '</ul>',
    '<p><strong>Tip:</strong> Keep records simple but consistent to improve decisions every season.</p>',
  ].join('');
}

async function run() {
  const courseId = 4;
  try {
    const lessons = await Lesson.findAll({where: {course_id: courseId}});
    let updated = 0;

    for (const lesson of lessons) {
      if (!lesson.content || !String(lesson.content).trim()) {
        await lesson.update({content: buildHtml(lesson.title)});
        updated += 1;
      }
    }

    const after = await Lesson.findAll({where: {course_id: courseId}});
    const stillEmpty = after.filter(
      lesson => !lesson.content || !String(lesson.content).trim(),
    ).length;

    console.log(
      JSON.stringify(
        {
          courseId,
          totalLessons: after.length,
          updatedLessons: updated,
          stillEmpty,
          sampleUpdatedTitles: after
            .filter(
              lesson =>
                lesson.content &&
                String(lesson.content).includes('This lesson explains the practical steps'),
            )
            .slice(0, 6)
            .map(lesson => lesson.title),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error('seed-error', error?.message || error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();
