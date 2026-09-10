// 内置英文短文。targets 为文章中的重点词（需与词典中的原形一致，大小写不敏感）。
window.PASSAGES = [
  {
    id: "ky-growth",
    bank: "kaoyan",
    title: "终身学习，不断成长",
    targets: [
      "achieve", "benefit", "career", "challenge", "community", "continuous",
      "essential", "goal", "improve", "maintain", "opportunity",
      "pursue"
    ],
    content:
      "New knowledge is no longer a luxury; it has become an essential part of modern life. " +
      "Technology constantly changes the way we work, so adults who continue to learn usually benefit the most. " +
      "A diploma is only a start, not the end. Those who pursue a new skill every year can improve their confidence and maintain a sense of purpose. " +
      "Small steps matter too. Setting a clear goal for each month gives you a direction, and you will achieve more than you expect over time. " +
      "Your career may change several times, and every change offers an opportunity to discover another side of yourself. " +
      "Learning is a continuous journey; each challenge makes you stronger, and every effort helps you play a better role in our community."
  },
  {
    id: "ky-city",
    bank: "kaoyan",
    title: "城市与乡村，如何选择",
    targets: [
      "advantage", "avoid", "countryside", "environment", "pace",
      "pressure", "prefer", "quality", "traffic", "urban"
    ],
    content:
      "Every year, many young people face a simple but difficult question: should they stay in a big city or move to the countryside? " +
      "Urban life offers better jobs, schools and hospitals, but the environment can be noisy and crowded. " +
      "Long journeys and heavy traffic increase daily pressure, and housing costs continue to rise. " +
      "By contrast, the countryside has the advantage of lower rent, fresher air and closer neighbours. " +
      "Some people prefer a slower pace there, while others value the quality of life that a large city provides. " +
      "A wise person may try to avoid what makes them unhappy instead of following fashion. " +
      "There is no single answer, because the best choice depends on your personality, your family and the future you want."
  },
  {
    id: "ky-think",
    bank: "kaoyan",
    title: "培养独立思考的能力",
    targets: [
      "assume", "conclusion", "critical", "evidence", "examine",
      "ignore", "logic", "observe", "prove", "question", "theory"
    ],
    content:
      "Critical thinking is a skill that can be trained. When you meet a new idea, do not assume it is true simply because many people repeat it. " +
      "First observe the facts, then examine the logic behind the argument. A good thinker always asks what evidence the author provides and whether that evidence can prove the conclusion. " +
      "A popular theory may sound convincing, but it fails when tested against real situations, so do not ignore obvious exceptions. " +
      "It is also healthy to question authority now and then; every great discovery once challenged accepted views. " +
      "By checking each step of reasoning, you gradually build the habit of independent judgment, which protects you from half-truths and misleading information."
  },
  {
    id: "cet4-campus",
    bank: "cet4",
    title: "充实的大学生活",
    targets: [
      "ability", "activity", "campus", "club", "course",
      "grade", "hobby", "library", "participate", "volunteer"
    ],
    content:
      "The campus is not only a place for classes; it is a small society where students discover who they are. " +
      "Besides required courses, you can join a club that matches your hobby, from music and drawing to sports and debate. " +
      "This activity can improve your social ability and give you confidence in front of others. " +
      "You may also participate in volunteer work on weekends, which helps you understand different lives. " +
      "Of course, the library remains your best friend: reading widely keeps your mind open and supports every grade you want to earn. " +
      "A balanced life with study, friends and service is the richest form of learning, and it prepares you for the years after graduation."
  },
  {
    id: "cet4-health",
    bank: "cet4",
    title: "健康生活的几个秘诀",
    targets: [
      "diet", "energy", "exercise", "fresh", "health",
      "medicine", "mood", "sleep", "stress", "weight"
    ],
    content:
      "Good health does not require expensive medicine; it grows from simple daily habits. " +
      "A balanced diet with vegetables, fruit and enough water gives your body steady energy throughout the day. " +
      "Regular exercise, even a thirty-minute walk, strengthens the heart and helps you control your weight. " +
      "Do not ignore sleep: a tired mind turns small problems into heavy stress, while seven or eight hours of rest improves your mood and memory. " +
      "Choose fresh food instead of snacks when you can, and learn to relax after work. " +
      "These choices may seem small, but together they decide your health in both the short term and the long term."
  },
  {
    id: "cet4-tech",
    bank: "cet4",
    title: "科技如何改变交流",
    targets: [
      "communication", "convenient", "digital", "distance", "instant", "mobile",
      "share", "social", "technology", "video"
    ],
    content:
      "Modern technology has completely changed communication. With a mobile phone, we can send an instant message to a friend on the other side of the world, and a video call makes the distance feel small. " +
      "Students attend digital courses at home, and families share photos in seconds. " +
      "Business meetings no longer require expensive travel, which makes working together far more convenient than before. " +
      "Social media also gives everyone a voice, allowing ideas to spread quickly across cultures. " +
      "Yet we must remember that real communication still depends on listening and respect. " +
      "A tool is useful only when we use it wisely; the machine can connect people, but only humans can build trust."
  },
  {
    id: "cet6-ai",
    bank: "cet6",
    title: "人工智能的一体两面",
    targets: [
      "artificial", "bias", "consciousness", "debate", "employment",
      "innovation", "intelligence", "legal", "privacy", "transform"
    ],
    content:
      "Artificial intelligence can transform almost every field, from medicine to education. " +
      "Machines with strong intelligence can process information faster than people, and their ability to find patterns has led to remarkable innovation. " +
      "At the same time, the rise of AI opens a serious debate about employment, because some jobs may disappear while new ones are still unknown. " +
      "Engineers must also face legal questions: who is responsible when an algorithm makes a wrong decision, and how can we remove hidden bias from its training data? " +
      "Privacy becomes fragile when systems collect huge amounts of personal information. " +
      "Some people even ask whether machines can develop consciousness. Whatever the answer, society needs clear rules before the technology runs ahead of human judgment."
  },
  {
    id: "cet6-carbon",
    bank: "cet6",
    title: "每个人都能为减碳出力",
    targets: [
      "carbon", "climate", "consumption", "emission", "fossil",
      "output", "renewable", "sustainable", "vehicle", "waste"
    ],
    content:
      "Climate change is no longer a distant problem, and reducing carbon emission has become a duty for everyone. " +
      "Transport is one of the biggest sources of pollution: choosing a bus or a bicycle over a private vehicle cuts your carbon output sharply. " +
      "At home, lower energy consumption means not only smaller bills but also a smaller burden on the earth. " +
      "When fossil fuels are replaced by renewable energy such as wind and solar power, whole industries become cleaner. " +
      "We also need to rethink waste, buying less, repairing more and separating rubbish carefully. " +
      "These actions support a sustainable future, and every small decision we make today influences the world our children will inherit."
  },
  {
    id: "cet6-culture",
    bank: "cet6",
    title: "全球化下的文化多样性",
    targets: [
      "ancient", "appreciate", "conflict", "culture", "diversity", "generation",
      "heritage", "identity", "preserve", "unique", "value"
    ],
    content:
      "Globalization brings people closer, yet the diversity of world culture remains one of our greatest treasures. " +
      "Each nation has a unique history, and its ancient festivals, food and stories shape the identity of every generation. " +
      "Old buildings and local languages are part of our heritage; if we do not preserve them, we lose more than stones and sounds. " +
      "Contact between cultures can cause conflict, but it more often creates understanding when we listen with respect. " +
      "We should value differences instead of forcing everyone into one style, and we can appreciate another culture without giving up our own. " +
      "A world rich in customs is stronger, more creative and far more interesting to live in."
  }
];
