import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { CoachInsight } from './entities/coach-insight.entity';
import { CoachMemory } from './entities/coach-memory.entity';
import { ProfilesService } from '../profiles/profiles.service';
import { ProgressService } from '../progress/progress.service';
import { WorkoutSession } from '../workouts/entities/workout-session.entity';
import { NutritionLog } from '../nutrition/entities/nutrition-log.entity';
import { Food } from '../nutrition/entities/food.entity';
import { Profile } from '../profiles/entities/profile.entity';

@Injectable()
export class CoachService {
  constructor(
    @InjectRepository(CoachInsight)
    private readonly insightRepo: Repository<CoachInsight>,
    @InjectRepository(CoachMemory)
    private readonly memoryRepo: Repository<CoachMemory>,
    @InjectRepository(WorkoutSession)
    private readonly workoutSessionRepo: Repository<WorkoutSession>,
    @InjectRepository(NutritionLog)
    private readonly nutritionLogRepo: Repository<NutritionLog>,
    @InjectRepository(Food)
    private readonly foodRepo: Repository<Food>,
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
    private readonly profilesService: ProfilesService,
    private readonly progressService: ProgressService,
    private readonly configService: ConfigService,
  ) {}

  async getLatestInsight(userId: string): Promise<CoachInsight | null> {
    return this.insightRepo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getMemory(userId: string): Promise<CoachMemory> {
    return this.findOrCreateMemory(userId);
  }

  async updateMemory(
    userId: string,
    updates: Partial<Pick<CoachMemory, 'injuries' | 'avoidedFoods' | 'preferences'>>,
  ): Promise<CoachMemory> {
    const memory = await this.findOrCreateMemory(userId);
    if (updates.injuries !== undefined) memory.injuries = updates.injuries;
    if (updates.avoidedFoods !== undefined) memory.avoidedFoods = updates.avoidedFoods;
    if (updates.preferences !== undefined) memory.preferences = updates.preferences;
    return this.memoryRepo.save(memory);
  }

  async analyzeUser(userId: string): Promise<CoachInsight> {
    const profile = await this.profilesService.findByUserId(userId);
    const memory = await this.findOrCreateMemory(userId);

    // Last 7 days workout completion
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const recentSessions = await this.workoutSessionRepo.find({
      where: { userId, date: MoreThanOrEqual(sevenDaysAgoStr) as any },
    });
    const completedSessions = recentSessions.filter((s) => s.completed).length;
    const plannedSessions = profile?.trainingDays ?? 3;

    // Last 7 days nutrition average
    const recentNutritionLogs = await this.nutritionLogRepo.find({
      where: { userId, date: MoreThanOrEqual(sevenDaysAgoStr) as any },
    });
    const avgDailyCalories = await this.computeAvgDailyCalories(recentNutritionLogs);

    // Weight trend from progress analytics
    const weightTrendNote = await this.buildWeightTrendNote(userId);

    const summary = `
User fitness goal: ${profile?.goal ?? 'unknown'}.
Fitness level: ${profile?.fitnessLevel ?? 'unknown'}.
This week: ${completedSessions}/${plannedSessions} workouts completed.
Average daily calories: ${avgDailyCalories} kcal (target: ${profile?.dailyCalories ?? 'unknown'} kcal).
${weightTrendNote}
Known injuries: ${memory.injuries.length > 0 ? memory.injuries.join(', ') : 'none'}.
Foods to avoid: ${memory.avoidedFoods.length > 0 ? memory.avoidedFoods.join(', ') : 'none'}.
Previous coach notes: ${memory.coachNotes || 'none'}.
    `.trim();

    const aiResult = await this.callGemini<{
      message: string;
      adjustments: {
        reduceSessionDays?: number;
        intensityModifier?: 'increase' | 'decrease' | 'maintain';
        notes?: string;
      };
    }>(
      `You are a personal fitness coach reviewing a user's weekly performance summary.
Based on the data below, write a short (2-3 sentences max) encouraging and specific coaching message.
Then return any program adjustments you recommend.

User summary:
${summary}

Respond with ONLY valid JSON matching this schema:
{
  "message": "coaching message here",
  "adjustments": {
    "reduceSessionDays": 0,
    "intensityModifier": "maintain",
    "notes": "optional notes"
  }
}`,
    );

    const insight = this.insightRepo.create({
      userId,
      message: aiResult.message,
      adaptations: aiResult.adjustments,
      weekStart: sevenDaysAgoStr,
      applied: false,
    });

    if (aiResult.adjustments?.notes) {
      memory.coachNotes = aiResult.adjustments.notes;
      await this.memoryRepo.save(memory);
    }

    return this.insightRepo.save(insight);
  }

  async chat(userId: string, message: string): Promise<{ reply: string }> {
    const memory = await this.findOrCreateMemory(userId);
    const profile = await this.profilesService.findByUserId(userId).catch(() => null);
    const latestInsight = await this.getLatestInsight(userId);

    const context = `
You are a personal fitness coach with memory of this user.
User goal: ${profile?.goal ?? 'unknown'}.
User injuries: ${memory.injuries.length > 0 ? memory.injuries.join(', ') : 'none'}.
Foods they avoid: ${memory.avoidedFoods.length > 0 ? memory.avoidedFoods.join(', ') : 'none'}.
Your last weekly message to them: ${latestInsight?.message ?? 'none yet'}.
Your notes about them: ${memory.coachNotes || 'none'}.
    `.trim();

    const result = await this.callGemini<{
      reply: string;
      memoryUpdate?: { injuries?: string[]; avoidedFoods?: string[]; notes?: string };
    }>(
      `${context}

The user says: "${message}"

Reply in 2-4 sentences. Be warm, specific, and practical.
If the user mentions an injury or food they dislike, extract it.

Respond with ONLY valid JSON:
{
  "reply": "your response here",
  "memoryUpdate": {
    "injuries": [],
    "avoidedFoods": [],
    "notes": ""
  }
}`,
    );

    if (result.memoryUpdate) {
      const upd = result.memoryUpdate;
      if (upd.injuries?.length) {
        memory.injuries = [...new Set([...memory.injuries, ...upd.injuries])];
      }
      if (upd.avoidedFoods?.length) {
        memory.avoidedFoods = [...new Set([...memory.avoidedFoods, ...upd.avoidedFoods])];
      }
      if (upd.notes) {
        memory.coachNotes = upd.notes;
      }
      await this.memoryRepo.save(memory);
    }

    return { reply: result.reply };
  }

  @Cron('0 8 * * 1')
  async runWeeklyForAllUsers(): Promise<void> {
    const profiles = await this.profileRepo.find();
    const activeProfiles = profiles.filter((p) => p.currentProgramId);
    for (const profile of activeProfiles) {
      try {
        await this.analyzeUser(profile.userId);
      } catch {
        // skip failed users — don't block others
      }
    }
  }

  private async computeAvgDailyCalories(logs: NutritionLog[]): Promise<number> {
    if (logs.length === 0) return 0;
    const byDate: Record<string, number> = {};
    for (const log of logs) {
      if (!byDate[log.date]) byDate[log.date] = 0;
      const food = await this.foodRepo.findOne({ where: { id: log.foodId } });
      if (food) {
        byDate[log.date] += Number(food.calories) * Number(log.quantity);
      }
    }
    const dailyTotals = Object.values(byDate);
    if (dailyTotals.length === 0) return 0;
    return Math.round(dailyTotals.reduce((a, b) => a + b, 0) / dailyTotals.length);
  }

  private async buildWeightTrendNote(userId: string): Promise<string> {
    try {
      const analytics = await this.progressService.getAnalyticsSummary(userId);
      if (analytics.hasData && analytics.prediction) {
        if (analytics.prediction.plateau) {
          return 'Weight has been stable (plateau detected).';
        }
        const rate = analytics.prediction.weeklyRate;
        return `Weight trend: ${rate > 0 ? '+' : ''}${rate} kg/week.`;
      }
    } catch {
      // fall through
    }
    return 'No weight data logged this week.';
  }

  private async findOrCreateMemory(userId: string): Promise<CoachMemory> {
    let memory = await this.memoryRepo.findOne({ where: { userId } });
    if (!memory) {
      memory = this.memoryRepo.create({
        userId,
        injuries: [],
        avoidedFoods: [],
        preferences: {},
        plateauLog: [],
      });
      memory = await this.memoryRepo.save(memory);
    }
    return memory;
  }

  // Tried in order — fall through to the next when one is overloaded (503).
  private static readonly GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

  private async callGemini<T>(prompt: string): Promise<T> {
    const apiKey = this.configService.get<string>('app.geminiApiKey');
    if (!apiKey) throw new InternalServerErrorException('Gemini API key not configured.');

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    };

    let lastStatus = 0;
    for (const model of CoachService.GEMINI_MODELS) {
      const result = await this.tryGeminiModel<T>(model, apiKey, payload);
      if (result.ok) return result.value;
      lastStatus = result.status;
      // transient (429/503) — fall through to the next model; otherwise fail fast
      if (result.status !== 429 && result.status !== 503) {
        throw new InternalServerErrorException(`Gemini API error: ${result.status}`);
      }
    }

    throw new InternalServerErrorException(`Gemini API unavailable after retries (${lastStatus})`);
  }

  // Retries one model up to 3 times with exponential backoff on 429/503 + network errors.
  private async tryGeminiModel<T>(
    model: string,
    apiKey: string,
    payload: unknown,
  ): Promise<{ ok: true; value: T } | { ok: false; status: number }> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    let delay = 1000;
    let lastStatus = 503;

    for (let attempt = 0; attempt < 3; attempt++) {
      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }

      if (response.ok) {
        const json = await response.json();
        const text: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        try {
          return { ok: true, value: JSON.parse(text) as T };
        } catch {
          throw new InternalServerErrorException('Failed to parse Gemini response.');
        }
      }

      lastStatus = response.status;
      if (response.status !== 429 && response.status !== 503) {
        return { ok: false, status: response.status };
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }

    return { ok: false, status: lastStatus };
  }
}
