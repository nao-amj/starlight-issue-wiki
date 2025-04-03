/**
 * Zettelkasten utilities for enhancing the wiki with knowledge management features
 */

import type { GitHubIssue } from '../data/types';
import { generateSlug } from './github';
import { BASE_PATH } from '../config';

// Zettelkasten note type extending GitHubIssue
export interface ZettelNote extends GitHubIssue {
  // Unique ID (using issue number by default)
  id: string;
  // Extracted links from content [[link]]
  links: string[];
  // Extracted tags from content #tag
  tags: string[];
  // Notes that link to this note (populated later)
  backlinks: Array<{
    id: string;
    title: string;
    slug: string;
    context: string; // The sentence or paragraph containing the link
  }>;
  // Creation date
  createdAt: Date;
  // Last modified date
  updatedAt: Date;
  // Slug for URL
  slug: string;
}

/**
 * Regular expression to find wiki-style links [[link]]
 */
const LINK_REGEX = /\[\[(.*?)\]\]/g;

/**
 * Regular expression to find hashtags #tag
 * Excludes markdown headers and matches standalone tags
 */
const TAG_REGEX = /(?<!#)#([a-zA-Z0-9_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF-]+)/g;

/**
 * Convert a GitHub issue to a Zettelkasten note
 */
export function issueToZettelNote(issue: GitHubIssue): ZettelNote {
  // Extract links from content
  const links: string[] = [];
  const bodyText = issue.body || '';
  let match;
  
  // Reset regex lastIndex to ensure proper matching
  LINK_REGEX.lastIndex = 0;
  
  while ((match = LINK_REGEX.exec(bodyText)) !== null) {
    links.push(match[1].trim());
  }

  // Extract tags (excluding label tags, which are handled separately)
  const tags: string[] = [];
  let tagMatch;
  
  // Reset regex lastIndex to ensure proper matching
  TAG_REGEX.lastIndex = 0;
  
  while ((tagMatch = TAG_REGEX.exec(bodyText)) !== null) {
    tags.push(tagMatch[1].trim());
  }

  // Add label names as tags
  const labelTags = issue.labels && Array.isArray(issue.labels)
    ? issue.labels
        .filter(label => label && typeof label === 'object' && 'name' in label)
        .map(label => label.name as string)
        .filter(name => name && !tags.includes(name))
    : [];
  
  const allTags = [...tags, ...labelTags];

  return {
    ...issue,
    id: `zettel-${issue.number}`,
    links,
    tags: allTags,
    backlinks: [], // To be populated later
    createdAt: new Date(issue.created_at),
    updatedAt: new Date(issue.updated_at),
    slug: generateSlug(issue.title),
  };
}

/**
 * Process an array of issues into Zettelkasten notes with backlinks
 */
export function processZettelNotes(issues: GitHubIssue[]): ZettelNote[] {
  // First, convert all issues to ZettelNotes
  const notes = issues.map(issue => issueToZettelNote(issue));
  
  // Create a map for easy lookup
  const noteMap = new Map<string, ZettelNote>();
  const slugMap = new Map<string, ZettelNote>();
  const titleMap = new Map<string, ZettelNote>();
  
  notes.forEach(note => {
    noteMap.set(note.id, note);
    slugMap.set(note.slug, note);
    // Also map by title (case-insensitive) for link resolution
    if (note.title) {
      titleMap.set(note.title.toLowerCase(), note);
    }
  });
  
  // Process backlinks
  notes.forEach(note => {
    // For each link in this note
    note.links.forEach(link => {
      // Normalize the link text
      const normalizedLink = link.toLowerCase();
      
      // Try to find the target note by title or slug
      const targetNote = titleMap.get(normalizedLink) || slugMap.get(normalizedLink);
      
      if (targetNote) {
        // Extract some context around the link (the paragraph or sentence containing it)
        const bodyText = note.body || '';
        const linkPattern = new RegExp(`\\[\\[${link}\\]\\]`);
        
        // Split by paragraphs
        let context = '';
        const paragraphs = bodyText.split(/\n\s*\n/);
        
        for (const paragraph of paragraphs) {
          if (paragraph.match(linkPattern)) {
            // Truncate context if too long
            context = paragraph.length > 150
              ? paragraph.substring(0, 150) + '...'
              : paragraph;
            break;
          }
        }
        
        // If no paragraph found, look for sentences
        if (!context) {
          const sentences = bodyText.match(/[^.!?]+[.!?]+/g) || [];
          for (const sentence of sentences) {
            if (sentence.match(linkPattern)) {
              context = sentence.trim();
              break;
            }
          }
        }
        
        // Add backlink to the target note
        targetNote.backlinks.push({
          id: note.id,
          title: note.title,
          slug: note.slug,
          context: context || `Referenced in ${note.title}`
        });
      }
    });
  });
  
  return notes;
}

/**
 * Replace wiki links [[link]] with HTML links
 */
export function processWikiLinks(content: string, notes: ZettelNote[]): string {
  // Create lookup maps for faster link resolution
  const titleMap = new Map<string, ZettelNote>();
  const slugMap = new Map<string, ZettelNote>();
  
  notes.forEach(note => {
    slugMap.set(note.slug, note);
    if (note.title) {
      titleMap.set(note.title.toLowerCase(), note);
    }
  });
  
  // Reset regex lastIndex to ensure proper matching
  LINK_REGEX.lastIndex = 0;
  
  return content.replace(LINK_REGEX, (match, linkText) => {
    const normalizedLink = linkText.toLowerCase();
    const targetNote = titleMap.get(normalizedLink) || slugMap.get(normalizedLink);
    
    if (targetNote) {
      return `<a href="${BASE_PATH}/wiki/${targetNote.slug}" class="wiki-link" data-note-id="${targetNote.id}">${linkText}</a>`;
    } else {
      // Create a link for a new note
      const newNoteSlug = linkText.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      return `<a href="#" class="wiki-link wiki-link-new" data-title="${linkText}">${linkText}</a>`;
    }
  });
}

/**
 * Process hashtags into clickable tags
 */
export function processTags(content: string): string {
  // Reset regex lastIndex to ensure proper matching
  TAG_REGEX.lastIndex = 0;
  
  return content.replace(TAG_REGEX, (match, tag) => {
    return `<a href="${BASE_PATH}/category/${tag}" class="tag-link">#${tag}</a>`;
  });
}

/**
 * Generate graph data for visualization
 */
export function generateGraphData(notes: ZettelNote[]) {
  const nodes = notes
    .filter(note => note.number > 0) // Only include real issues
    .map(note => ({
      id: note.id,
      label: note.title,
      title: note.title,
      slug: note.slug,
      tags: note.tags,
      group: note.tags.length > 0 ? note.tags[0] : 'untagged'
    }));
  
  const edges: Array<{ from: string; to: string }> = [];
  
  notes.forEach(note => {
    note.links.forEach(link => {
      // Normalize the link text
      const normalizedLink = link.toLowerCase();
      
      // Find the target note by title or slug
      const targetNote = notes.find(
        n => (n.title && n.title.toLowerCase() === normalizedLink) || n.slug === normalizedLink
      );
      
      if (targetNote) {
        edges.push({
          from: note.id,
          to: targetNote.id
        });
      }
    });
  });
  
  return { nodes, edges };
}
