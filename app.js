async function getPokemonData(nameOrId) {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${nameOrId.toLowerCase()}`);
  if (!res.ok) throw new Error("Pokémon no encontrado");
  return await res.json();
}

async function getTypeEffectiveness(typeName) {
  const res = await fetch(`https://pokeapi.co/api/v2/type/${typeName}`);
  const data = await res.json();
  return data.damage_relations.double_damage_to.map(t => t.name);
}

async function getEvolutionStage(pokemon) {
  const speciesRes = await fetch(pokemon.species.url);
  const speciesData = await speciesRes.json();
  const evoRes = await fetch(speciesData.evolution_chain.url);
  const evoData = await evoRes.json();

  let stage = 1;
  let current = evoData.chain;

  // Buscamos al Pokémon en su cadena de evolución
  while (current && current.evolves_to.length > 0) {
    if (current.species.name === pokemon.name) return stage;
    if (current.evolves_to.some(evo => evo.species.name === pokemon.name)) return stage + 1;
    current = current.evolves_to[0];
    stage++;
  }

  return stage; // Si no lo encuentra, lo deja como básico
}

function mostrarPokemonHTML(pokemon, resultId) {
  const stats = pokemon.stats.map(s => `<li>${s.stat.name}: ${s.base_stat}</li>`).join("");
  const habilidades = pokemon.abilities.map(h => h.ability.name).join(", ");
  const imagen = pokemon.sprites.front_default || "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png";

  document.getElementById(resultId).innerHTML = `
    <h4>${pokemon.name.toUpperCase()}</h4>
    <img src="${imagen}" />
    <p><strong>Tipo:</strong> ${pokemon.types.map(t => t.type.name).join(", ")}</p>
    <p><strong>Habilidades:</strong> ${habilidades}</p>
    <ul>${stats}</ul>
  `;
}

async function iniciarBatalla() {
  const nombre1 = document.getElementById("pokemon1").value.trim();
  const nombre2 = document.getElementById("pokemon2").value.trim();

  if (!nombre1 || !nombre2) {
    alert("Ambos jugadores deben ingresar un Pokémon.");
    return;
  }

  try {
    const [poke1, poke2] = await Promise.all([
      getPokemonData(nombre1),
      getPokemonData(nombre2)
    ]);

    mostrarPokemonHTML(poke1, "result1");
    mostrarPokemonHTML(poke2, "result2");

    let score1 = 0;
    let score2 = 0;

    // 1. Tipo
    for (const tipo1 of poke1.types) {
      const efectivos = await getTypeEffectiveness(tipo1.type.name);
      for (const tipoOponente of poke2.types) {
        if (efectivos.includes(tipoOponente.type.name)) score1++;
      }
    }

    for (const tipo2 of poke2.types) {
      const efectivos = await getTypeEffectiveness(tipo2.type.name);
      for (const tipoOponente of poke1.types) {
        if (efectivos.includes(tipoOponente.type.name)) score2++;
      }
    }

    // 2. Habilidades ofensivas
    const habilidadesOfensivas = [
      "huge-power", "pure-power", "solar-power", "sheer-force",
      "technician", "adaptability", "guts", "strong-jaw",
      "tough-claws", "skill-link", "analytic", "hustle",
      "iron-fist", "sharpness", "moxie"
    ];

    const habilidades1 = poke1.abilities.map(h => h.ability.name);
    const habilidades2 = poke2.abilities.map(h => h.ability.name);

    if (habilidades1.some(h => habilidadesOfensivas.includes(h))) score1++;
    if (habilidades2.some(h => habilidadesOfensivas.includes(h))) score2++;

    // 3. Evolución
    const [etapa1, etapa2] = await Promise.all([
      getEvolutionStage(poke1),
      getEvolutionStage(poke2)
    ]);
    if (etapa1 > etapa2) score1++;
    else if (etapa2 > etapa1) score2++;

    // 4. Estadísticas base si hay empate
    let resultado = "";
    if (score1 > score2) {
      resultado = `🏆 ¡Gana ${poke1.name.toUpperCase()} por ventaja estratégica!`;
    } else if (score2 > score1) {
      resultado = `🏆 ¡Gana ${poke2.name.toUpperCase()} por ventaja estratégica!`;
    } else {
      const totalStats1 = poke1.stats.reduce((sum, s) => sum + s.base_stat, 0);
      const totalStats2 = poke2.stats.reduce((sum, s) => sum + s.base_stat, 0);

      if (totalStats1 > totalStats2) {
        resultado = `🏆 ¡Gana ${poke1.name.toUpperCase()} por mejores estadísticas base!`;
      } else if (totalStats2 > totalStats1) {
        resultado = `🏆 ¡Gana ${poke2.name.toUpperCase()} por mejores estadísticas base!`;
      } else {
        resultado = "🤝 ¡Empate total! Tipos, habilidades, evolución y stats iguales.";
      }
    }

    document.getElementById("winner").innerHTML = `<h2>${resultado}</h2>`;
  } catch (err) {
    alert("Error: " + err.message);
  }
}
