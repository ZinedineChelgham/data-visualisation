
d3.select("body").append("p").text("Hello World!");

const DATASET_PATH = "data/wasabi_data_preprocessed.json";

 async function loadData() {
    try {
        return await d3.json(DATASET_PATH);
    } catch (error) {
        console.error("Error loading data:", error);
        throw error; // Re-throw the error for error handling further up the call stack
    }
}

loadData().then(data => {
    console.log(data);
});


  