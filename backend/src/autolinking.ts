
export const autolink = async (content: string, dbs: D1Database[]): Promise<string> => {
    const promises = dbs.map(db => db.prepare("SELECT id, title FROM posts WHERE status = 'published'").all());
    const results = await Promise.all(promises);
    const posts = results.flatMap(result => result.results as { id: string; title: string }[]);

    let newContent = content;

    posts.forEach(post => {
      const regex = new RegExp(`(?<!<a[^>]*>)\\b(${post.title})\\b(?!<\\/a>)`, 'gi');
      newContent = newContent.replace(regex, `<a href="/blog/${post.id}">${post.title}</a>`);
    });

    return newContent;
  };
