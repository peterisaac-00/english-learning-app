// Speaking topics organized by difficulty level
export const SPEAKING_TOPICS = {
  1: [
    "Talk about your favorite food",
    "Describe your daily routine",
    "Tell me about your family",
    "What is your favorite hobby?",
    "Describe your hometown",
    "Talk about your favorite movie",
    "What do you like to do on weekends?",
    "Describe your best friend",
    "Talk about your favorite book",
    "What is your dream job?",
  ],
  2: [
    "Discuss the importance of education",
    "Talk about environmental issues",
    "Describe a memorable trip",
    "What are your career goals?",
    "Discuss the role of technology in society",
    "Talk about your favorite cultural tradition",
    "Describe a challenging situation you overcame",
    "What does friendship mean to you?",
    "Discuss the benefits of exercise",
    "Talk about your favorite season and why",
  ],
  3: [
    "Discuss the impact of social media on society",
    "Talk about the importance of work-life balance",
    "Describe your philosophy on learning languages",
    "Discuss global warming and climate change",
    "Talk about the role of artificial intelligence",
    "Describe your ideal future",
    "Discuss the importance of cultural diversity",
    "Talk about your most valuable life lesson",
    "Describe the challenges of modern education",
    "Discuss the future of remote work",
  ],
  4: [
    "Analyze the relationship between language and culture",
    "Discuss the ethical implications of technology",
    "Talk about the evolution of communication",
    "Describe your perspective on globalization",
    "Discuss the role of media in shaping public opinion",
    "Talk about the psychology of human motivation",
    "Describe the impact of literature on society",
    "Discuss the future of sustainable living",
    "Talk about the philosophy of happiness",
    "Describe the challenges of cross-cultural communication",
  ],
  5: [
    "Discuss the intersection of philosophy and science",
    "Talk about the nature of consciousness",
    "Analyze the role of innovation in human progress",
    "Describe your thoughts on existentialism",
    "Discuss the ethics of artificial intelligence",
    "Talk about the future of human civilization",
    "Describe the relationship between art and society",
    "Discuss the implications of quantum mechanics",
    "Talk about the philosophy of time",
    "Describe the future of human-machine interaction",
  ],
};

export function getRandomTopic(difficulty: number): string {
  const topics = SPEAKING_TOPICS[difficulty as keyof typeof SPEAKING_TOPICS] || SPEAKING_TOPICS[1];
  return topics[Math.floor(Math.random() * topics.length)];
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
