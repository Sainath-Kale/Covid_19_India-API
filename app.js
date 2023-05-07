const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
const path = require("path");
const dbPath = path.join(__dirname, "covid19India.db");
let db = null;
app.use(express.json());
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();
const convertStateToPascalCase = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};
const convertDistrictDbObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};
//1 return a list of all states in the state table
app.get("/states/", async (request, response) => {
  const getAllStateQuery = `
    SELECT  * FROM state ;
    `;
  const statesArray = await db.all(getAllStateQuery);
  response.send(
    statesArray.map((stateObject) => convertStateToPascalCase(stateObject))
  );
});

//2 returns a state based on state Id
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT * FROM state WHERE state_id=${stateId};
    `;
  const state = await db.get(getStateQuery);
  //console.log(stateId);
  response.send(convertStateToPascalCase(state));
});

//3 create a district in the district table,
app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const addDistrictQuery = `
    INSERT INTO 
    district (district_name,state_id,cases,cured,active,deaths) VALUES
    (
        '${districtName}', 
    ${stateId},
        ${cases},
        ${cured},
        ${active},
        ${deaths});
    `;
  const dbResponse = await db.run(addDistrictQuery);
  //console.log(dbResponse);
  response.send("District Successfully Added");
});

//4 return a district based on district ID
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
    SELECT * FROM district WHERE district_id=${districtId};
    `;
  const district = await db.get(getDistrictQuery);
  //console.log(district);
  response.send(convertDistrictDbObjectToResponseObject(district));
});

//5 deletes a district from district table based on district id
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
    DELETE FROM district
    WHERE district_id=${districtId};
    `;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

//6 updates the district Details based on districtId

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const updateDistrictQuery = `
    UPDATE district
    SET
    district_name='${districtName}', 
   state_id= ${stateId},
       cases= ${cases},
       cured= ${cured},
       active= ${active},
        deaths=${deaths}

    WHERE district_id=${districtId};
    `;
  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

//7 returns the statistics of total cases,cured,deaths,active of specific state based on stateId

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateStatsQuery = `
    SELECT
      SUM(cases) as totalCases,
      SUM(cured) as totalCured,
      SUM(active) as totalActive,
      SUM(deaths) as totalDeaths
    FROM
      district
    WHERE
      state_id=${stateId};`;
  const stats = await db.get(getStateStatsQuery);
  response.send(stats);
});

//8 returns an object containing the state name of a district based on district Id

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateNameQuery = `
    SELECT
      state_name As stateName
    FROM
      district
    INNER JOIN
      state
      ON 
      district.state_id=state.state_id
    WHERE 
      district_id=${districtId};`;
  const stateName = await db.get(getStateNameQuery);
  response.send(stateName);
});

module.exports = app;
