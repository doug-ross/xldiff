// JS tbltools utilities
// 2015-05-09 DR beta release
//

// Grab a URL parameter by name.
//
function GetParameterByName(name) {
	var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
	return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

// Enumerate columns for the "which columns to ignore" prompt.
//
function EnumerateColumns(sControl, aOptions) {
	//
	var sHeader  = "<tr>";
	var sColumns = "<tr>";
	//
	for (var i = 0; i < aOptions.length; i++) {
		sHeader  += "<td align='center'>" + aOptions[i] + "</td>";
		aOptions[i] = aOptions[i].replace(/\W/g, "");
		sColumns += "<td align='center'>" + "<input type='checkbox' id='" + "IGN" + aOptions[i] + "' name='" + "IGN" + aOptions[i] + "' >" + "</td>";
	}
	//
	sHeader  += "</tr>";
	sColumns += "</tr>";
	//
	$(sControl).html(sHeader + sColumns);
}

// Convert delimited string into html table columns.
//
function ConvertRowIntoColumns(sRow, nRow, sDelim, aChanges) {
	//
	var		sClass;
	//
	if (sDelim === undefined) {
		sDelim = "\t";
	}
	//
	var aCols = MapRowToColumns(sRow, sDelim);
	if (aCols.length > 1) {
		if (nRow) {
			aCols.unshift(nRow);
		} else {
			aCols.unshift(" # ");
		}
	}
	var sAlign;
	var sTemp;
	//
	for (var i = 0; i < aCols.length; i++) {
		//
		sClass = "";
		//
		if (!nRow) {
			sAlign = "align='center'";
		} else {
			if (i) {
				sAlign = "align='left'";
			} else {
				sAlign = "align='right'";
			}
		}
		//
		if (aChanges != undefined  &&  aChanges[i - 1] != undefined) {
			sClass = "class='colchg'";
		}
		//
		sTemp = aCols[i];
		aCols[i] = "<td " + sAlign + " " + sClass + ">" + sTemp + "</td>";
		//
	}
	return (aCols.join("\n"));
	//
}

// Take file and diff objects and render into html summary table.
//
function ConvertFileToTable(sFile, oSettings, oDiffs, nFile) {
	//
	var		aColumnNames;
	var		aRows = [];
	var		sClass;
	var		sTemp;
	//
	do {

		//	Assign delimiter.
		//
		sDelimiter = "\t";
		if (oSettings["delimiter"] != undefined) {
			sDelimiter = oSettings["delimiter"];
		}
		
		//	Convert file to rows...
		//
		aRows = MapFileToRows(sFile);

		//	Let's iterate through the file row by row, skipping header...
		//
		for (i = 0; i < aRows.length; i++) {
		
			//	No class to begin with.  Class indicates adds, deletes, changes.
			//
			sClass = "";
			
			//	First row? It's column names.
			//
			if (!i) {
				aColumnNames = MapHeaderToColumnNames(aRows[0], sDelimiter);
				sClass = "dummy";
			}

			//	If this is one of the deleted rows from the first file, mark it.
			//
			aChanges = undefined;
			if (nFile == 1  &&  oDiffs["file1"][i] != undefined) {
				//
				if (oDiffs["file1"][i] == "del") {
					sClass = "rowdel";
				} else if (oDiffs["file1"][i] == "chg") {
					aChanges = oDiffs["changes1"][i];
					sClass = "rowchg";
				} else if (oDiffs["file1"][i] == "rev") {
					sClass = "rowrev";
				}
			}
			if (nFile == 2  &&  oDiffs["file2"][i] != undefined) {
				//
				if (oDiffs["file2"][i] == "add") {
					sClass = "rowadd";
				} else if (oDiffs["file2"][i] == "chg") {
					aChanges = oDiffs["changes2"][i];
					sClass = "rowchg";
				}
			}

			//	Convert row into actual HTML table columns.
			//
			sTemp = ConvertRowIntoColumns(aRows[i], i, sDelimiter, aChanges);

			//	Add the row.
			//
			aRows[i] = "<tr class='" + sClass + "'>" + sTemp + "</tr>";
			
		//	...end loop through rows.
		//
		}
		
	//
	} while (0);
	return (aRows.join("\n"));
}

//	Convert array to dropdown.
//
function ArrayToDropdown(sSelectedControl, aOptions) {
	var sOptions = '';
	for (var i = 0; i < aOptions.length; i++){
		sOptions += '<option value="'+ aOptions[i] + '">' + aOptions[i] + '</option>';
	}
	$(sSelectedControl).empty();
	$(sSelectedControl).append(sOptions).selectmenu();
	$(sSelectedControl).prop('selectedIndex', -1);
	$(sSelectedControl).selectmenu('enable');
}

//	Convert a tab-delimited string to CSV.
//
function ConvertTabDelimittedToCSV(sTabs) {
	var aLines = sTabs.split('\n');
	var aFinished = [];
	var find = '(\t(?=(?:(?:[^"]*"){2})*[^"]*$))';
	for (var i = 0; i < aLines.length; i++) {
		var regex = new RegExp(find, 'g');
		var sConverted = aLines[i].replace(regex, ',');
		aFinished.push(sConverted);
	}
	return (aFinished.join('\n'));
}

//	Try to set up file handling basics.
//
function SetupFileHandling(v) {
	//
	var aOptions = GetFileColumnNames(v);
	var sOptions = JSON.stringify(aOptions);
	oSettings["columns"] = aOptions;
	if (oSettings["columns"] === undefined  ||  (oSettings["columns"] != undefined  &&  oSettings["columns"] != sOptions)) {
		oSettings["columns"] = sOptions;
		EnumerateColumns("#ignorecolumns", aOptions);
	}
	//
	$('#currentdelimiter').html(oSettings["delimiterpretty"]);
}

//	Read a file and shove into the selected control.
//
function ReadTextFile(sSelectedControl, e) {
	if (e.target.files != undefined) {
		var reader = new FileReader();
		reader.onload = function(e) {
			$(sSelectedControl).html(e.target.result);
			SetupFileHandling(e.target.result);
		};
		reader.readAsText(e.target.files.item(0));
	}
}


// --30--
