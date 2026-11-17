// قاموس الكلمات. الصيغة: الكلمة|النوع|المعنى|التعريف|الجملة (الكلمة بين { })|المستوى|الموضوع
// المعرّف = الكلمة نفسها بحروف صغيرة، فلا تغيّر كلمة موجودة بعد النشر حتى لا يضيع تقدّم المستخدمين.
const RAW = `
accept|v|يقبل|to take something that is offered|Please {accept} this small gift from me.|1|life
afraid|adj|خائف|feeling fear|He is {afraid} of the dark.|1|feel
agree|v|يوافق|to have the same opinion|I {agree} with your plan.|1|social
allow|v|يسمح|to let someone do something|My parents do not {allow} me to stay out late.|1|social
arrive|v|يصل|to reach a place|The train will {arrive} at six o'clock.|1|travel
borrow|v|يستعير|to take something and give it back later|Can I {borrow} your pen for a minute?|1|life
brave|adj|شجاع|ready to face danger without fear|The {brave} boy saved his little sister.|1|feel
bridge|n|جسر|a structure that crosses a river or road|We walked across the old {bridge}.|1|travel
careful|adj|حذر|thinking about what you do to avoid problems|Be {careful} when you cross the street.|1|life
change|v|يغيّر|to make something different|I want to {change} my old habits.|1|life
cheap|adj|رخيص|not costing much money|This shirt is {cheap} but nice.|1|life
choose|v|يختار|to pick one thing from several|It is hard to {choose} between the two cakes.|1|life
clean|adj|نظيف|free from dirt|Please keep your room {clean}.|1|life
clever|adj|ذكي|quick to learn and understand|She is a {clever} student.|1|edu
crowd|n|حشد|a large number of people together|A big {crowd} waited outside the stadium.|1|social
dangerous|adj|خطير|likely to cause harm|Swimming here is {dangerous}.|1|life
decide|v|يقرّر|to make a choice after thinking|I need to {decide} before tomorrow.|1|life
delay|n|تأخير|a time when something is late|There was a long {delay} at the airport.|1|travel
dinner|n|عشاء|the main meal in the evening|We eat {dinner} at eight.|1|life
double|adj|مضاعف|twice as much|I would like a {double} portion of rice.|1|life
early|adv|مبكرًا|before the usual time|I woke up {early} this morning.|1|life
easy|adj|سهل|not difficult|The test was very {easy}.|1|edu
empty|adj|فارغ|with nothing inside|The box is {empty}.|1|life
enjoy|v|يستمتع|to like doing something|I {enjoy} reading before bed.|1|feel
enough|adv|بما يكفي|as much as needed|Do we have {enough} water for the trip?|1|life
exercise|n|تمرين|physical activity to stay healthy|Daily {exercise} keeps you strong.|1|health
famous|adj|مشهور|known by many people|He is a {famous} singer.|1|social
fresh|adj|طازج|new and not old or stored for long|I bought {fresh} bread this morning.|1|life
future|n|مستقبل|the time that has not happened yet|I think about my {future} a lot.|1|life
gentle|adj|لطيف|soft and kind in the way you act|Be {gentle} with the baby.|1|feel
guess|v|يخمّن|to give an answer without being sure|Can you {guess} my age?|1|life
habit|n|عادة|something you do often without thinking|Brushing teeth is a good {habit}.|1|health
healthy|adj|صحي|good for the body|Fruit is a {healthy} snack.|1|health
honest|adj|صادق|always telling the truth|An {honest} person does not lie.|1|feel
hungry|adj|جائع|wanting to eat|I am very {hungry} now.|1|health
invite|v|يدعو|to ask someone to come to an event|I will {invite} all my friends to the party.|1|social
journey|n|رحلة|a long trip from one place to another|The {journey} took three days.|1|travel
kind|adj|طيب|caring about other people|She is a {kind} neighbor.|1|feel
lazy|adj|كسول|not wanting to work or be active|I feel {lazy} on Fridays.|1|feel
luggage|n|أمتعة|bags you take when you travel|Where can I leave my {luggage}?|1|travel
mistake|n|خطأ|something that is not correct|Everyone makes a {mistake} sometimes.|1|edu
modern|adj|حديث|of the present time, not old|They live in a {modern} apartment.|1|life
neighbor|n|جار|a person who lives near you|My {neighbor} has a friendly dog.|1|social
noisy|adj|صاخب|making a lot of sound|The street is too {noisy} at night.|1|life
patient|adj|صبور|able to wait calmly|You must be {patient} with young children.|1|feel
polite|adj|مؤدب|having good manners|It is {polite} to say thank you.|1|social
price|n|سعر|the money you pay for something|What is the {price} of this bag?|1|life
promise|v|يعد|to say you will surely do something|I {promise} to call you tonight.|1|social
quiet|adj|هادئ|with little or no noise|The library is very {quiet}.|1|life
repeat|v|يكرّر|to say or do again|Could you {repeat} that, please?|1|edu
safe|adj|آمن|not in danger|Keep your money in a {safe} place.|1|life
search|v|يبحث|to look for something carefully|I {search} for my keys every morning.|1|life
share|v|يشارك|to let another person use or have part|We {share} one room.|1|social
simple|adj|بسيط|easy to understand or do|The rules of the game are {simple}.|1|edu
sleepy|adj|ناعس|needing sleep|The long drive made me {sleepy}.|1|health
smell|n|رائحة|the quality you notice with your nose|I love the {smell} of fresh coffee.|1|life
strange|adj|غريب|unusual and hard to explain|I heard a {strange} noise last night.|1|life
surprise|n|مفاجأة|something you do not expect|The party was a big {surprise}.|1|feel
taste|n|طعم|the flavor of food|I like the {taste} of mint.|1|life
thirsty|adj|عطشان|needing to drink|After the race I was very {thirsty}.|1|health
useful|adj|مفيد|helpful for a purpose|A dictionary is a {useful} tool.|1|edu
wonderful|adj|رائع|very good|We had a {wonderful} holiday.|1|feel
worry|v|يقلق|to feel anxious about something|Do not {worry}, everything will be fine.|1|feel
accomplish|v|ينجز|to successfully finish something|She worked hard to {accomplish} her goal.|2|work
achieve|v|يحقّق|to get something by effort|You can {achieve} anything if you try.|2|work
admire|v|يُعجَب بـ|to respect and like someone|I {admire} her courage.|2|feel
advantage|n|ميزة|something that puts you in a better position|Speaking two languages is a big {advantage}.|2|work
afford|v|يتحمّل ثمنه|to have enough money to buy|I cannot {afford} a new car.|2|life
ambition|n|طموح|a strong wish to succeed|His {ambition} is to become a doctor.|2|work
announce|v|يعلن|to tell people something officially|The school will {announce} the results tomorrow.|2|social
apologize|v|يعتذر|to say you are sorry|I want to {apologize} for being late.|2|social
appointment|n|موعد|an arrangement to meet at a set time|I have a dentist {appointment} at noon.|2|health
approach|n|أسلوب|a way of dealing with something|We need a new {approach} to this problem.|2|work
available|adj|متاح|able to be used or found|Is this room {available} tonight?|2|travel
average|adj|متوسط|typical, not high or low|The {average} age in the class is fifteen.|2|edu
behave|v|يتصرّف|to act in a certain way|Please {behave} well in front of guests.|2|social
benefit|n|فائدة|a good result or help|Reading has many {benefit}s for the mind.|2|health
border|n|حدود|the line between two countries|We crossed the {border} by bus.|2|travel
budget|n|ميزانية|a plan for how to spend money|We have a small {budget} for the trip.|2|work
candidate|n|مرشّح|a person who applies for a job or position|The best {candidate} will get the job.|2|work
challenge|n|تحدٍّ|something difficult that tests you|Learning a new language is a real {challenge}.|2|edu
compare|v|يقارن|to look at how things are alike or different|Let us {compare} the two phones.|2|edu
complain|v|يشتكي|to say you are not happy about something|Customers often {complain} about slow service.|2|social
concentrate|v|يركّز|to give all your attention to something|It is hard to {concentrate} with loud music.|2|edu
confident|adj|واثق|sure about your own abilities|She felt {confident} before the interview.|2|feel
consider|v|يفكّر في|to think about something carefully|Please {consider} my offer.|2|work
courage|n|شجاعة|the ability to face fear|It takes {courage} to speak the truth.|2|feel
create|v|يبتكر|to make something new|Artists {create} beautiful things.|2|work
curious|adj|فضولي|wanting to know or learn|Children are naturally {curious}.|2|feel
deadline|n|موعد نهائي|the latest time to finish a task|The {deadline} for the report is Friday.|2|work
destination|n|وجهة|the place where someone is going|Our final {destination} is Istanbul.|2|travel
develop|v|يطوّر|to grow or make better over time|The company will {develop} a new app.|2|tech
disappointed|adj|محبَط|sad because things were not as hoped|I was {disappointed} with the result.|2|feel
discover|v|يكتشف|to find something for the first time|Scientists {discover} new species every year.|2|nature
embarrassed|adj|محرَج|feeling shy or uncomfortable|He felt {embarrassed} when he forgot her name.|2|feel
encourage|v|يشجّع|to give someone hope or confidence|Teachers should {encourage} their students.|2|social
environment|n|بيئة|the natural world around us|We must protect the {environment}.|2|nature
exhausted|adj|مُنهك|extremely tired|She was {exhausted} after the marathon.|2|health
experience|n|خبرة|knowledge gained by doing something|He has ten years of {experience} in sales.|2|work
fascinating|adj|مذهل|extremely interesting|The documentary was truly {fascinating}.|2|feel
flexible|adj|مرِن|able to change easily|I have a {flexible} schedule this week.|2|work
generous|adj|كريم|happy to give to others|He is {generous} with his time and money.|2|feel
glance|v|يلقي نظرة|to look quickly|She will {glance} at the menu and decide.|2|life
grateful|adj|ممتن|feeling thanks|I am {grateful} for your help.|2|feel
guarantee|v|يضمن|to promise that something will happen|We {guarantee} the quality of our products.|2|work
hesitate|v|يتردّد|to pause before doing something|Do not {hesitate} to ask questions.|2|social
improve|v|يحسّن|to make or become better|Practice will {improve} your English.|2|edu
independent|adj|مستقل|not needing help from others|She became {independent} at eighteen.|2|life
influence|n|تأثير|the power to change how people think|Friends have a strong {influence} on teenagers.|2|social
instead|adv|بدلًا من ذلك|in place of something else|We stayed home {instead} of going out.|2|life
journalist|n|صحفي|a person who writes news reports|The {journalist} asked the mayor a question.|2|work
knowledge|n|معرفة|information and understanding you have|Reading increases your {knowledge}.|2|edu
manage|v|يتدبّر|to succeed in doing something difficult|I will {manage} to finish on time.|2|work
mature|adj|ناضج|fully grown or sensible|He is very {mature} for his age.|2|feel
negotiate|v|يتفاوض|to discuss to reach an agreement|They will {negotiate} the price tomorrow.|2|work
obvious|adj|واضح|easy to see or understand|The answer was {obvious} to everyone.|2|edu
opportunity|n|فرصة|a chance to do something good|This job is a great {opportunity}.|2|work
persuade|v|يقنع|to make someone agree by giving reasons|I could not {persuade} him to come.|2|social
prevent|v|يمنع|to stop something from happening|Vaccines {prevent} many diseases.|2|health
priority|n|أولوية|something more important than the rest|Safety is our first {priority}.|2|work
recommend|v|يوصي|to suggest something as good|Can you {recommend} a good restaurant?|2|social
reliable|adj|موثوق|able to be trusted|He is a {reliable} friend.|2|social
reputation|n|سمعة|the opinion people have about someone|The hotel has an excellent {reputation}.|2|work
require|v|يتطلّب|to need something|This course will {require} a lot of time.|2|edu
reserve|v|يحجز|to arrange to keep something for later|I want to {reserve} a table for four.|2|travel
responsible|adj|مسؤول|having the duty to take care of something|Parents are {responsible} for their children.|2|social
schedule|n|جدول|a plan of times for events|My {schedule} is full today.|2|work
suggest|v|يقترح|to offer an idea|I {suggest} we leave early.|2|social
temporary|adj|مؤقت|lasting for a short time only|He has a {temporary} job for the summer.|2|work
tradition|n|تقليد|a custom passed down over time|Sharing coffee is an old {tradition}.|2|social
unusual|adj|غير معتاد|not common|It is {unusual} to see snow here.|2|life
volunteer|n|متطوّع|a person who works without pay|The {volunteer} cleaned the beach.|2|social
abandon|v|يهجر|to leave something and not return|They had to {abandon} the sinking ship.|3|life
accurate|adj|دقيق|exactly correct|The report must be {accurate}.|3|work
adapt|v|يتكيّف|to change to fit a new situation|It takes time to {adapt} to a new city.|3|life
analyze|v|يحلّل|to study something in detail|Scientists {analyze} the data carefully.|3|edu
anxiety|n|قلق|a strong feeling of worry|Exams cause a lot of {anxiety}.|3|health
appreciate|v|يُثمّن|to value something or be thankful|I really {appreciate} your support.|3|feel
assume|v|يفترض|to accept something as true without proof|Do not {assume} that he knows.|3|edu
attitude|n|موقف|the way you think and feel about something|A positive {attitude} helps you succeed.|3|feel
authority|n|سلطة|the power to give orders|Only the manager has the {authority} to sign.|3|work
awkward|adj|محرج|uncomfortable or difficult|There was an {awkward} silence in the room.|3|social
balance|n|توازن|a state where things are equal and steady|Try to keep a {balance} between work and rest.|3|health
bias|n|تحيّز|an unfair preference for one side|The judge showed no {bias}.|3|social
capable|adj|قادر|having the ability to do something|She is {capable} of leading the team.|3|work
cautious|adj|متحفّظ|careful to avoid danger|Be {cautious} when you drive in the rain.|3|life
commit|v|يلتزم|to promise to do something|He will {commit} to the project fully.|3|work
conflict|n|نزاع|a serious disagreement|They tried to solve the {conflict} peacefully.|3|social
consequence|n|عاقبة|the result of an action|Every choice has a {consequence}.|3|life
consistent|adj|متّسق|always behaving in the same way|Be {consistent} and practice every day.|3|edu
contribute|v|يساهم|to give something to help a goal|Everyone should {contribute} to the team.|3|work
convince|v|يُقنع|to make someone believe something|He tried to {convince} me it was safe.|3|social
crucial|adj|حاسم|extremely important|Sleep is {crucial} for good health.|3|health
decline|v|يتراجع|to become smaller or weaker|Sales began to {decline} last year.|3|work
dedicate|v|يكرّس|to give your time to something|She will {dedicate} her life to science.|3|work
demand|n|طلب|a strong request or need|There is a high {demand} for fresh water.|3|work
determine|v|يحدّد|to find out or decide exactly|Tests will {determine} the cause of the problem.|3|edu
distinguish|v|يميّز|to see the difference between things|Can you {distinguish} butter from margarine?|3|edu
efficient|adj|فعّال|working well without wasting time|This machine is very {efficient}.|3|tech
eliminate|v|يستبعد|to remove completely|We must {eliminate} waste from our process.|3|work
emphasize|v|يؤكّد|to show that something is important|The teacher will {emphasize} the key points.|3|edu
enhance|v|يعزّز|to make something better|Good lighting can {enhance} any room.|3|tech
estimate|v|يقدّر|to guess an amount roughly|I {estimate} the trip will cost two hundred.|3|work
evaluate|v|يقيّم|to judge how good something is|Teachers {evaluate} students every term.|3|edu
evidence|n|دليل|facts that show something is true|The police found new {evidence}.|3|social
fundamental|adj|أساسي|forming the basis of something|Honesty is {fundamental} to trust.|3|edu
harsh|adj|قاسٍ|cruel or very severe|The {harsh} winter killed many plants.|3|nature
impact|n|أثر|a strong effect|Social media has a big {impact} on youth.|3|tech
inevitable|adj|حتمي|certain to happen|Change is {inevitable}.|3|life
inspire|v|يُلهم|to make someone want to do something|Her story will {inspire} many people.|3|feel
integrity|n|نزاهة|being honest and having strong principles|He is known for his {integrity}.|3|feel
maintain|v|يحافظ على|to keep something in good condition|You must {maintain} your car regularly.|3|tech
obstacle|n|عقبة|something that blocks your way|Fear is the biggest {obstacle} to success.|3|life
overcome|v|يتغلّب على|to succeed in dealing with a problem|She worked hard to {overcome} her shyness.|3|feel
perspective|n|منظور|a particular way of thinking about something|Travel gives you a new {perspective}.|3|social
persistent|adj|مثابر|continuing to try even when it is hard|Be {persistent} and you will win.|3|feel
potential|n|إمكانات|ability that may develop in the future|The young player has great {potential}.|3|work
predict|v|يتنبّأ|to say what will happen|No one can {predict} the weather exactly.|3|nature
primary|adj|رئيسي|most important|Our {primary} goal is to learn.|3|edu
reluctant|adj|متردّد|not willing to do something|He was {reluctant} to share his secret.|3|feel
reveal|v|يكشف|to show something that was hidden|The test will {reveal} the truth.|3|social
significant|adj|ملحوظ|large or important enough to notice|There was a {significant} change in his grades.|3|edu
sustain|v|يدعم استمرار|to keep something going over time|Trees {sustain} life on earth.|3|nature
tolerate|v|يتحمّل|to accept something unpleasant|I cannot {tolerate} loud noise.|3|social
transform|v|يحوّل|to change completely|Technology will {transform} our lives.|3|tech
vulnerable|adj|هشّ|easily hurt or harmed|Young animals are {vulnerable} to danger.|3|nature
ambiguous|adj|ملتبس|having more than one possible meaning|The instructions were {ambiguous}.|4|edu
arbitrary|adj|عشوائي|based on chance, not reason|The choice seemed {arbitrary} to me.|4|edu
coherent|adj|مترابط|clear, logical, and well connected|He gave a {coherent} explanation.|4|edu
compelling|adj|مقنع بقوة|very interesting or convincing|She made a {compelling} argument.|4|social
comprehensive|adj|شامل|including everything|The book gives a {comprehensive} guide to grammar.|4|edu
controversial|adj|مثير للجدل|causing strong disagreement|It was a {controversial} decision.|4|social
credible|adj|جدير بالثقة|able to be believed|The witness seemed {credible}.|4|social
deliberate|adj|متعمّد|done on purpose|It was a {deliberate} choice, not an accident.|4|life
diminish|v|يتضاءل|to become smaller or less|Pain will {diminish} with time.|4|health
discrepancy|n|تباين|a difference between things that should match|There is a {discrepancy} in the two reports.|4|work
dismiss|v|يتجاهل|to decide that something is not important|Do not {dismiss} his ideas so quickly.|4|social
elaborate|v|يسهب في الشرح|to give more details|Could you {elaborate} on your plan?|4|work
eloquent|adj|بليغ|able to speak clearly and beautifully|He gave an {eloquent} speech.|4|social
endorse|v|يؤيّد|to say publicly that you support|The doctor will {endorse} this treatment.|4|work
exploit|v|يستغلّ|to use something or someone unfairly|Some companies {exploit} cheap labor.|4|work
feasible|adj|ممكن التنفيذ|able to be done|Is the plan {feasible} within a month?|4|work
hinder|v|يعيق|to make something harder to do|Heavy rain may {hinder} our progress.|4|life
implement|v|ينفّذ|to put a plan into action|We will {implement} the changes next week.|4|work
inherent|adj|متأصّل|existing as a natural part of something|Risk is {inherent} in any business.|4|work
mitigate|v|يخفّف|to make something less serious|Trees {mitigate} the effects of heat.|4|nature
mundane|adj|روتيني|ordinary and boring|He escaped his {mundane} daily routine.|4|life
nuance|n|فروق دقيقة|a small difference in meaning|She understood every {nuance} of the poem.|4|edu
obsolete|adj|عفا عليه الزمن|no longer used|Floppy disks are now {obsolete}.|4|tech
perceive|v|يدرك|to notice or understand in a certain way|Some people {perceive} silence as peaceful.|4|edu
pragmatic|adj|عملي|dealing with things in a realistic way|She took a {pragmatic} approach to the problem.|4|work
profound|adj|عميق|very deep or serious|The film had a {profound} effect on me.|4|feel
resilient|adj|مرِن نفسيًا|able to recover quickly|Children are often {resilient}.|4|feel
scrutinize|v|يدقّق|to examine very carefully|Auditors {scrutinize} every account.|4|work
skeptical|adj|مشكّك|doubting that something is true|I am {skeptical} about his story.|4|social
spontaneous|adj|عفوي|done naturally without planning|They took a {spontaneous} trip to the coast.|4|life
subtle|adj|خفي|not obvious, and hard to notice|There is a {subtle} difference between the two colors.|4|edu
superficial|adj|سطحي|looking only at the surface|He has only a {superficial} knowledge of law.|4|edu
tangible|adj|ملموس|able to be touched or clearly seen|We need {tangible} proof of progress.|4|work
thrive|v|يزدهر|to grow strong and be successful|Plants {thrive} in warm weather.|4|nature
ubiquitous|adj|منتشر في كل مكان|seen everywhere|Smartphones are {ubiquitous} today.|4|tech
undermine|v|يقوّض|to make something weaker bit by bit|Lies will {undermine} trust.|4|social
versatile|adj|متعدّد الاستخدامات|able to do many different things|Rice is a {versatile} food.|4|life
volatile|adj|متقلّب|likely to change quickly|The market is very {volatile} this year.|4|work
whereas|conj|بينما|used to show a contrast|He likes tea, {whereas} I like coffee.|4|edu
`;
export const POS_AR = { n: 'اسم', v: 'فعل', adj: 'صفة', adv: 'ظرف', conj: 'أداة ربط' };
export const LEVELS = { 1: { name: 'المبتدئ', cefr: 'A2' }, 2: { name: 'المتوسط', cefr: 'B1' }, 3: { name: 'المتقدّم', cefr: 'B2' }, 4: { name: 'المتمكّن', cefr: 'C1' } };
export const TOPICS = { life: 'الحياة اليومية', work: 'العمل', travel: 'السفر', feel: 'المشاعر', tech: 'التقنية', health: 'الصحة', nature: 'الطبيعة', edu: 'الدراسة', social: 'العلاقات' };
export const WORDS = [];
export const BY_ID = {};
for (const line of RAW.trim().split('\n')) {
  const [en, pos, ar, def, ex, lvl, topic] = line.split('|');
  if (!en || BY_ID[en.toLowerCase()]) continue;
  const w = { id: en.toLowerCase(), en, pos, ar, def, ex, lvl: +lvl, topic };
  WORDS.push(w); BY_ID[w.id] = w;
}
export const wordOfDay = (d = new Date()) => WORDS[Math.floor(d.getTime() / 864e5) % WORDS.length];
