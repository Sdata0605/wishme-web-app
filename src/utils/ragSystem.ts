import navigationData from '@/data/knowledge-base/navigation.json';
import featuresData from '@/data/knowledge-base/features.json';
import formsData from '@/data/knowledge-base/forms.json';
import faqsData from '@/data/knowledge-base/faqs.json';
import celebrityInfoData from '@/data/knowledge-base/celebrity-info.json';
import bookingGuideData from '@/data/knowledge-base/booking-guide.json';
import troubleshootingData from '@/data/knowledge-base/troubleshooting.json';

export interface SearchResult {
  type: 'page' | 'feature' | 'form' | 'faq';
  title: string;
  content: string;
  relevance: number;
  metadata?: any;
}

export interface PageContext {
  currentRoute: string;
  userRole?: 'user' | 'celebrity' | 'admin';
  formContext?: {
    formId: string;
    fields: Record<string, any>;
  };
}

/**
 * Calculate relevance score between query and text using simple keyword matching
 */
function calculateRelevance(query: string, text: string, keywords: string[] = []): number {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  let score = 0;

  // Direct text match
  if (textLower.includes(queryLower)) {
    score += 10;
  }

  // Word matches
  const queryWords = queryLower.split(/\s+/);
  queryWords.forEach(word => {
    if (word.length > 2 && textLower.includes(word)) {
      score += 2;
    }
  });

  // Keyword matches
  keywords.forEach(keyword => {
    if (queryLower.includes(keyword.toLowerCase())) {
      score += 5;
    }
  });

  return score;
}

/**
 * Search pages in the knowledge base
 */
export function searchPages(query: string, currentRoute?: string): SearchResult[] {
  const results: SearchResult[] = [];

  navigationData.pages.forEach(page => {
    const relevance = calculateRelevance(
      query,
      `${page.name} ${page.description} ${page.features.join(' ')}`,
      page.keywords
    );

    // Boost relevance if it's the current page
    const adjustedRelevance = page.route === currentRoute ? relevance + 5 : relevance;

    if (adjustedRelevance > 0) {
      results.push({
        type: 'page',
        title: page.name,
        content: page.description,
        relevance: adjustedRelevance,
        metadata: page
      });
    }
  });

  return results.sort((a, b) => b.relevance - a.relevance);
}

/**
 * Search features in the knowledge base
 */
export function searchFeatures(query: string): SearchResult[] {
  const results: SearchResult[] = [];

  featuresData.features.forEach(feature => {
    const relevance = calculateRelevance(
      query,
      `${feature.name} ${feature.description} ${feature.howTo}`,
      feature.keywords
    );

    if (relevance > 0) {
      results.push({
        type: 'feature',
        title: feature.name,
        content: feature.description,
        relevance,
        metadata: feature
      });
    }
  });

  return results.sort((a, b) => b.relevance - a.relevance);
}

/**
 * Search forms in the knowledge base
 */
export function searchForms(query: string, currentRoute?: string): SearchResult[] {
  const results: SearchResult[] = [];

  formsData.forms.forEach(form => {
    const fieldTexts = Object.entries(form.fields)
      .map(([key, field]: [string, any]) => `${field.label} ${field.description}`)
      .join(' ');

    const relevance = calculateRelevance(
      query,
      `${form.formName} ${form.description} ${fieldTexts}`,
      []
    );

    // Boost relevance if it's the current page
    const adjustedRelevance = currentRoute && currentRoute.includes(form.page.split('/:')[0])
      ? relevance + 10
      : relevance;

    if (adjustedRelevance > 0) {
      results.push({
        type: 'form',
        title: form.formName,
        content: form.description,
        relevance: adjustedRelevance,
        metadata: form
      });
    }
  });

  return results.sort((a, b) => b.relevance - a.relevance);
}

/**
 * Search FAQs in the knowledge base
 */
export function searchFAQs(query: string): SearchResult[] {
  const results: SearchResult[] = [];

  faqsData.faqs.forEach(category => {
    category.questions.forEach(faq => {
      const relevance = calculateRelevance(
        query,
        `${faq.question} ${faq.answer}`,
        faq.keywords
      );

      if (relevance > 0) {
        results.push({
          type: 'faq',
          title: faq.question,
          content: faq.answer,
          relevance,
          metadata: { ...faq, category: category.category }
        });
      }
    });
  });

  return results.sort((a, b) => b.relevance - a.relevance);
}

/**
 * Search celebrity information
 */
export function searchCelebrityInfo(query: string): SearchResult[] {
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();

  // Search categories
  celebrityInfoData.categories.forEach(category => {
    const relevance = calculateRelevance(query, `${category.name} ${category.description}`, category.keywords);
    if (relevance > 0) {
      results.push({
        type: 'feature',
        title: `${category.name} Category`,
        content: category.description,
        relevance,
        metadata: category
      });
    }
  });

  // Search services
  celebrityInfoData.services.forEach(service => {
    const relevance = calculateRelevance(
      query, 
      `${service.name} ${service.description} ${service.price_range}`,
      service.keywords
    );
    if (relevance > 0) {
      results.push({
        type: 'feature',
        title: service.name,
        content: `${service.description}. Price: ${service.price_range}. Delivery: ${service.delivery}`,
        relevance,
        metadata: service
      });
    }
  });

  // Search popular celebrities
  celebrityInfoData.popular_celebrities.forEach(celeb => {
    const relevance = calculateRelevance(query, `${celeb.name} ${celeb.category}`, celeb.keywords);
    if (relevance > 0) {
      results.push({
        type: 'feature',
        title: celeb.name,
        content: `${celeb.category} celebrity available for bookings`,
        relevance: relevance + 5, // Boost celebrity matches
        metadata: celeb
      });
    }
  });

  return results.sort((a, b) => b.relevance - a.relevance);
}

/**
 * Search booking guide information
 */
export function searchBookingGuide(query: string): SearchResult[] {
  const results: SearchResult[] = [];

  // Search booking process steps
  bookingGuideData.booking_process.steps.forEach(step => {
    const relevance = calculateRelevance(
      query,
      `${step.title} ${step.description} ${step.tips?.join(' ')}`,
      ['booking', 'book', 'how to', 'process']
    );
    if (relevance > 0) {
      results.push({
        type: 'feature',
        title: `Step ${step.step}: ${step.title}`,
        content: step.description,
        relevance,
        metadata: step
      });
    }
  });

  // Search payment methods
  if (query.toLowerCase().includes('payment') || query.toLowerCase().includes('pay')) {
    bookingGuideData.payment_info.methods.forEach(method => {
      const relevance = calculateRelevance(query, `${method.name} ${method.description}`, ['payment', 'pay']);
      results.push({
        type: 'faq',
        title: `Payment via ${method.name}`,
        content: `${method.description}. Benefits: ${method.benefits.join(', ')}`,
        relevance: relevance + 3,
        metadata: method
      });
    });
  }

  return results.sort((a, b) => b.relevance - a.relevance);
}

/**
 * Search troubleshooting information
 */
export function searchTroubleshooting(query: string): SearchResult[] {
  const results: SearchResult[] = [];

  // Search common issues
  troubleshootingData.common_issues.forEach(issue => {
    const relevance = calculateRelevance(
      query,
      `${issue.issue} ${issue.symptoms.join(' ')} ${issue.solutions.join(' ')}`,
      issue.keywords
    );
    if (relevance > 0) {
      results.push({
        type: 'faq',
        title: issue.issue,
        content: `Solutions: ${issue.solutions.slice(0, 3).join('. ')}.`,
        relevance: relevance + 2, // Boost troubleshooting
        metadata: issue
      });
    }
  });

  // Search feature guides
  troubleshootingData.feature_guides.forEach(guide => {
    const relevance = calculateRelevance(
      query,
      `${guide.feature} ${guide.description} ${guide.how_to_use.join(' ')}`,
      guide.keywords
    );
    if (relevance > 0) {
      results.push({
        type: 'feature',
        title: guide.feature,
        content: guide.description,
        relevance,
        metadata: guide
      });
    }
  });

  return results.sort((a, b) => b.relevance - a.relevance);
}

/**
 * Main RAG search function - searches across all knowledge base
 */
export function searchKnowledgeBase(query: string, context?: PageContext): SearchResult[] {
  const pageResults = searchPages(query, context?.currentRoute);
  const featureResults = searchFeatures(query);
  const formResults = searchForms(query, context?.currentRoute);
  const faqResults = searchFAQs(query);
  const celebrityResults = searchCelebrityInfo(query);
  const bookingResults = searchBookingGuide(query);
  const troubleshootingResults = searchTroubleshooting(query);

  // Combine and sort all results
  const allResults = [
    ...pageResults, 
    ...featureResults, 
    ...formResults, 
    ...faqResults,
    ...celebrityResults,
    ...bookingResults,
    ...troubleshootingResults
  ];
  
  return allResults
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 8); // Increased from 5 to 8 for more context
}

/**
 * Get page-specific context for AI assistant
 */
export function getPageContext(route: string): any {
  const page = navigationData.pages.find(p => 
    p.route === route || route.startsWith(p.route.split('/:')[0])
  );

  if (!page) return null;

  return {
    page,
    quickActions: page.quickActions,
    relatedPages: page.relatedPages
  };
}

/**
 * Get form field information for auto-fill
 */
export function getFormInfo(route: string): any {
  const form = formsData.forms.find(f => 
    route.includes(f.page.split('/:')[0])
  );

  return form || null;
}

/**
 * Extract field values from natural language for form filling
 */
export function extractFormFieldValues(query: string, formInfo: any): Record<string, string> {
  const extracted: Record<string, string> = {};

  if (!formInfo || !formInfo.fields) return extracted;

  // Simple extraction based on keywords and patterns
  const queryLower = query.toLowerCase();

  Object.entries(formInfo.fields).forEach(([fieldKey, fieldInfo]: [string, any]) => {
    // Check if query mentions this field
    const fieldLabel = fieldInfo.label.toLowerCase();
    const fieldDesc = (fieldInfo.description || '').toLowerCase();

    if (queryLower.includes(fieldLabel) || queryLower.includes(fieldDesc)) {
      // Try to extract value after field mention
      const words = query.split(/\s+/);
      const labelWords = fieldLabel.split(/\s+/);
      
      for (let i = 0; i < words.length; i++) {
        if (labelWords.some(lw => words[i].toLowerCase().includes(lw))) {
          // Get words after this field mention
          const valueWords = words.slice(i + labelWords.length, i + labelWords.length + 5);
          if (valueWords.length > 0) {
            extracted[fieldKey] = valueWords.join(' ');
          }
        }
      }
    }
  });

  return extracted;
}

/**
 * Generate context-aware prompt for AI
 */
export function buildAIPrompt(
  userQuery: string,
  context: PageContext,
  searchResults: SearchResult[]
): string {
  const pageContext = context.currentRoute ? getPageContext(context.currentRoute) : null;
  const formInfo = context.currentRoute ? getFormInfo(context.currentRoute) : null;

  let systemPrompt = `You are a helpful AI assistant for a celebrity booking and AI content generation platform. 
Your role is to help users navigate the platform, fill forms, and answer questions.

Current Context:
- User is on page: ${context.currentRoute || 'unknown'}
${pageContext ? `- Page name: ${pageContext.page.name}` : ''}
${pageContext ? `- Page description: ${pageContext.page.description}` : ''}
- User role: ${context.userRole || 'user'}

Available information from knowledge base:
${searchResults.map(r => `- ${r.title}: ${r.content}`).join('\n')}

${formInfo ? `\nForm on current page: ${formInfo.formName}\nFields: ${Object.keys(formInfo.fields).join(', ')}` : ''}

Guidelines:
1. Be conversational and helpful
2. If user asks about navigation, provide clear directions
3. If user needs help with forms, offer to fill fields they mention
4. Provide quick actions when relevant
5. Use knowledge base information to answer questions accurately
6. Be concise but informative

User query: ${userQuery}`;

  return systemPrompt;
}
