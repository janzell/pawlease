export interface Guide {
  slug: string;
  title: string;
  emoji: string;
  category: "Health" | "Daily care" | "Training" | "Family";
  summary: string;
  callout?: { tone: "danger" | "info"; text: string };
  sections: { heading: string; text?: string[]; list?: string[] }[];
}

export const GUIDES: Guide[] = [
  {
    slug: "emergency",
    title: "Emergency signs & first aid",
    emoji: "🚑",
    category: "Health",
    summary: "When to call the vet right now, and what to do on the way.",
    callout: {
      tone: "danger",
      text: "If you think your dog is in danger, call your vet or the nearest emergency clinic immediately. Ring ahead while you travel so they can prepare.",
    },
    sections: [
      {
        heading: "Go to a vet immediately if you see",
        list: [
          "Difficulty breathing, choking, or blue/grey gums",
          "Collapse, inability to stand, or sudden weakness",
          "A swollen, tight belly with retching that brings nothing up (possible bloat — life-threatening)",
          "A seizure lasting more than 5 minutes, or several in a row",
          "Suspected poisoning (see the Toxic foods guide), even if your dog seems fine",
          "Heavy bleeding that doesn't slow after 5 minutes of firm pressure",
          "Heatstroke signs: heavy panting, drooling, bright red gums, wobbliness, vomiting",
          "Straining to urinate with little or nothing coming out",
          "Hit by a car or a bad fall, even if they walk away",
        ],
      },
      {
        heading: "While you get help",
        list: [
          "Stay calm and keep your dog as still and quiet as possible.",
          "Bleeding: press a clean cloth firmly on the wound and keep it there.",
          "Overheating: move to shade, wet them with cool (not ice-cold) water, and let them drink small amounts. Then go to the vet.",
          "Poisoning: do not make your dog vomit unless a vet tells you to. Bring the packaging or a photo of what was eaten.",
          "Seizures: move furniture away, don't put your hand near the mouth, and time the seizure.",
          "Injured dogs may bite out of pain. Approach slowly and support the body when lifting.",
        ],
      },
      {
        heading: "Be ready before anything happens",
        list: [
          "Save your vet and your nearest 24-hour emergency clinic under Professionals, so everyone in the family has them.",
          "Keep medications, allergies and microchip numbers in each dog's profile.",
          "Keep a basic kit: gauze, bandage, saline, tick remover, blunt scissors, a towel and a spare lead.",
        ],
      },
    ],
  },
  {
    slug: "toxic-foods",
    title: "Toxic foods & household dangers",
    emoji: "🚫",
    category: "Health",
    summary: "Common things in the kitchen and around the house that can poison dogs.",
    callout: { tone: "danger", text: "If your dog has eaten any of these, call your vet or a pet poison helpline straight away, even if they seem fine." },
    sections: [
      {
        heading: "Foods",
        list: [
          "Chocolate, cocoa and coffee. Dark and baking chocolate are the most dangerous.",
          "Xylitol (birch sugar), found in sugar-free gum, some peanut butters, sweets and toothpaste. Small amounts can be life-threatening.",
          "Grapes, raisins, sultanas and currants, which can cause kidney failure",
          "Onions, garlic, leeks and chives, in any form (raw, cooked or powdered)",
          "Macadamia nuts",
          "Alcohol, and raw bread or pizza dough",
          "Cooked bones, which can splinter",
          "Very fatty foods (bacon, gravy, trimmings), which can trigger pancreatitis",
        ],
      },
      {
        heading: "Around the house and garden",
        list: [
          "Human medicines, especially ibuprofen, naproxen, paracetamol/acetaminophen and antidepressants",
          "Rat and mouse bait, and slug pellets",
          "Antifreeze, which tastes sweet and is extremely toxic",
          "Sago palm, azaleas, oleander, foxglove, and tulip and daffodil bulbs",
          "Cannabis and nicotine products, including vape liquids",
          "Corn cobs, socks and small toys, which can cause a blockage if swallowed",
        ],
      },
    ],
  },
  {
    slug: "vaccines-parasites",
    title: "Vaccines & parasite prevention",
    emoji: "💉",
    category: "Health",
    summary: "Typical vaccine timelines and how to keep fleas, ticks and worms away.",
    callout: { tone: "info", text: "Schedules vary by country and lifestyle, so your vet will tailor them. Add each due date as a repeating task so the whole family sees it." },
    sections: [
      {
        heading: "Puppies",
        list: [
          "Core vaccines (distemper, parvovirus, adenovirus/hepatitis) usually start at 6–8 weeks.",
          "Boosters follow every 2–4 weeks until about 16 weeks old.",
          "Rabies is given where required by law, usually from 12–16 weeks.",
          "Avoid places where unknown dogs gather until your vet gives the all-clear.",
        ],
      },
      {
        heading: "Adults",
        list: [
          "Booster around 12 months, then usually every 1–3 years depending on the vaccine.",
          "Non-core vaccines (leptospirosis, kennel cough/Bordetella, Lyme) depend on where you live and what your dog does, such as daycare, boarding or hiking.",
          "An annual check-up is a good time to review everything.",
        ],
      },
      {
        heading: "Parasites",
        list: [
          "Flea and tick prevention: usually monthly or quarterly, depending on the product.",
          "Heartworm prevention: monthly where heartworm is present.",
          "Intestinal worming: often every 3 months for adults, and more often for puppies.",
          "Check for ticks after walks in long grass or bush, especially around ears, armpits and toes.",
        ],
      },
    ],
  },
  {
    slug: "feeding",
    title: "Feeding basics",
    emoji: "🥣",
    category: "Daily care",
    summary: "How often to feed, how much, and how to tell if your dog is a healthy weight.",
    sections: [
      {
        heading: "How often",
        list: [
          "Puppies under 6 months: 3–4 small meals a day",
          "From about 6 months: 2 meals a day",
          "Adults: 2 meals a day, about 8–12 hours apart, usually works best.",
          "Fresh water should always be available. Refill and wash the bowl daily.",
        ],
      },
      {
        heading: "How much",
        text: [
          "Start with the feeding guide on the food packaging for your dog's ideal weight, then adjust based on body condition. Active dogs need more, and neutered or older dogs often need less.",
          "Keep treats under about 10% of daily calories, and count training treats too.",
        ],
      },
      {
        heading: "Body condition check",
        list: [
          "You should be able to feel the ribs easily without pressing hard.",
          "From above, there should be a visible waist behind the ribs.",
          "From the side, the belly should tuck up toward the back legs.",
          "Log weight regularly with the Weight quick action to spot slow changes.",
        ],
      },
      {
        heading: "Switching foods",
        text: [
          "Change gradually over 7–10 days, mixing more of the new food in each day, to avoid upset tummies.",
        ],
      },
      {
        heading: "Avoid double feeding",
        text: [
          "Use the Fed quick action after each meal. Everyone in the family will see the dog has been fed, which helps stop accidental second breakfasts.",
        ],
      },
    ],
  },
  {
    slug: "exercise",
    title: "Exercise, walks & hot weather",
    emoji: "🦮",
    category: "Daily care",
    summary: "How much activity dogs need, and how to keep walks safe in the heat.",
    sections: [
      {
        heading: "How much exercise",
        list: [
          "Most adult dogs need 30 minutes to 2 hours of activity a day, depending on breed, age and health.",
          "Working and herding breeds often need more, plus mental work such as sniffing games, puzzle feeders and training.",
          "Puppies do best with short, frequent play sessions rather than long forced walks.",
          "Seniors still benefit from daily gentle walks. Let them set the pace.",
        ],
      },
      {
        heading: "Hot weather",
        list: [
          "The 7-second test: hold the back of your hand on the pavement. If you can't keep it there for 7 seconds, it's too hot for paws.",
          "Walk early in the morning or late in the evening in summer.",
          "Never leave a dog in a parked car, even with the windows open.",
          "Flat-faced breeds (pugs, bulldogs, Frenchies) overheat easily. Keep their exercise gentle and cool.",
          "Carry water on longer walks.",
        ],
      },
    ],
  },
  {
    slug: "grooming",
    title: "Grooming & hygiene",
    emoji: "🛁",
    category: "Daily care",
    summary: "Brushing, baths, nails, teeth and ears: what to do and how often.",
    sections: [
      {
        heading: "Routine at a glance",
        list: [
          "Brushing: daily for long or double coats, weekly for short coats",
          "Baths: about every 4–8 weeks, or when dirty. Use dog shampoo, since human shampoo can irritate their skin.",
          "Nails: trim every 3–4 weeks. If you hear clicking on hard floors, they're too long.",
          "Teeth: brush daily if possible, using dog toothpaste only. Human toothpaste can contain xylitol.",
          "Ears: check weekly for redness, smell or discharge, and clean only if needed.",
        ],
      },
      {
        heading: "Make it pleasant",
        text: [
          "Keep sessions short and pair them with treats. Handle paws, ears and mouth often while your dog is calm, so grooming and vet checks are less stressful.",
          "Set these up as repeating tasks and assign them, so they don't fall through the cracks.",
        ],
      },
    ],
  },
  {
    slug: "training",
    title: "Training basics",
    emoji: "🎓",
    category: "Training",
    summary: "Reward-based training, socialisation, and getting the whole family consistent.",
    sections: [
      {
        heading: "Principles",
        list: [
          "Reward what you want with food, play or praise, within a second or two of the behaviour.",
          "Keep sessions short (5–10 minutes) and end on a success.",
          "Avoid punishment. It damages trust and often makes fear and reactivity worse.",
          "Manage the environment so mistakes are hard to make, for example by putting shoes away and using baby gates.",
        ],
      },
      {
        heading: "Start with",
        list: ["Name response", "Sit and down", "Come (recall)", "Leave it", "Loose-lead walking", "Settle on a mat"],
      },
      {
        heading: "Socialisation",
        text: [
          "Puppies are most open to new experiences between roughly 3 and 14 weeks. Gently introduce people, surfaces, sounds, handling and calm dogs. Keep it positive and never force it.",
        ],
      },
      {
        heading: "Family consistency",
        text: [
          "Agree on the same cue words and house rules (is the couch allowed?) and pin them as a note so everyone, including sitters, uses them.",
        ],
      },
    ],
  },
  {
    slug: "new-puppy",
    title: "New puppy checklist",
    emoji: "🐣",
    category: "Family",
    summary: "What to get, and what to do in the first weeks home.",
    sections: [
      {
        heading: "Shopping list",
        list: [
          "Crate or bed, and a puppy pen or baby gates",
          "Food and water bowls, and the same food the breeder or shelter used",
          "Collar or harness, ID tag and lead",
          "Chew toys, a puzzle feeder and small training treats",
          "Enzyme cleaner for accidents",
          "Puppy shampoo, a brush and nail clippers",
        ],
      },
      {
        heading: "First weeks",
        list: [
          "Book a vet check within the first few days. Add the vet under Professionals.",
          "Register or update the microchip with your details.",
          "Take them out to toilet after waking, eating, playing, and every 1–2 hours while awake.",
          "Plan daily handling and socialisation. Keep it calm and positive.",
          "Puppy-proof the house: cables, shoes, chemicals and small objects.",
          "Agree a feeding, toilet and walk rota, and set it up as assigned tasks.",
        ],
      },
    ],
  },
  {
    slug: "senior",
    title: "Caring for a senior dog",
    emoji: "👴",
    category: "Health",
    summary: "Changes to watch for and how to keep older dogs comfortable.",
    sections: [
      {
        heading: "Watch for",
        list: [
          "Drinking or urinating more than usual",
          "Stiffness, slowing down, or reluctance to use stairs or jump",
          "Weight loss or gain, and lumps or bumps",
          "Bad breath or dropping food, which can be a sign of dental pain",
          "Confusion, night-time restlessness or changes in sleep",
        ],
      },
      {
        heading: "Helping them",
        list: [
          "Vet checks every 6 months are often recommended for seniors.",
          "Use non-slip rugs, ramps and a supportive orthopaedic bed.",
          "Give shorter, more frequent walks and gentle mental games.",
          "Ask your vet about joint support and senior diets.",
          "Log weight monthly so slow changes are easy to spot.",
        ],
      },
    ],
  },
  {
    slug: "family-routine",
    title: "Sharing care with your family",
    emoji: "👨‍👩‍👧",
    category: "Family",
    summary: "How to split dog duties fairly and keep everyone in the loop with Pawlease.",
    sections: [
      {
        heading: "Set it up once",
        list: [
          "Invite everyone from the Family page by sharing the invite link or code.",
          "Add each dog's profile with food, allergies, meds and microchip, so anyone can answer the vet's questions.",
          "Save your vet, groomer and walker under Professionals. Your go-to vet shows up as My Vet.",
        ],
      },
      {
        heading: "Day to day",
        list: [
          "Use quick actions (Fed, Walk, Meds, Potty) as you go, so everyone can see what's done.",
          "Create repeating tasks for routines like flea treatment, nail trims and heartworm, and assign them.",
          "Put bookings in Pawlease and add them to your calendar with one tap.",
          "Pin shared rules and cue words as notes.",
        ],
      },
      {
        heading: "Going away?",
        text: [
          "A sitter can join your household with the invite code while you're away, and you can remove them from the Family page afterwards.",
        ],
      },
    ],
  },
];
