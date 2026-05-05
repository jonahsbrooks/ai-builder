const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ID = process.env.NOTION_DATABASE_ID;

const STATUS_TO_COL = {
  'Suggested':   'suggested',
  'To Build':    'to-build',
  'In Progress': 'in-progress',
  'Done':        'done',
};

const COL_TO_STATUS = {
  'suggested':   'Suggested',
  'to-build':    'To Build',
  'in-progress': 'In Progress',
  'done':        'Done',
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    if (req.method === 'GET') {
      const response = await notion.databases.query({ database_id: DB_ID });
      const rows = response.results.map(page => ({
        id: page.id,
        name: page.properties.Name?.title?.[0]?.plain_text ?? '',
        desc: page.properties.Description?.rich_text?.[0]?.plain_text ?? '',
        priority: page.properties.Priority?.select?.name ?? 'Low',
        status: STATUS_TO_COL[page.properties.Status?.select?.name] ?? 'to-build',
      }));
      return res.json(rows);
    }

    if (req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { id, status } = body ?? {};
      const notionStatus = COL_TO_STATUS[status];
      if (!id || !notionStatus) return res.status(400).json({ error: 'bad request' });

      await notion.pages.update({
        page_id: id,
        properties: { Status: { select: { name: notionStatus } } },
      });
      return res.json({ ok: true });
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
