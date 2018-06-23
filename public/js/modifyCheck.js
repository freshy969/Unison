maxLength = 64;
maxLengthBio = 500;
imageChosen = false;

/**
 * Associo agli elementi della form il gestore degli eventi che si occupa di controllare
 * che i diversi campi siano stati riempiti in modo appropriato
 */
$(document).ready(function () {

    // Dopo aver selezionato una foto aggiorno la textbox corrispondente
    // in modo che contenga il titolo della foto selezionata
    $("#photoMod").on('change', function(){
        $photoName = getChooserName($(this));
        //replace the "Choose a file" label
        $(this).next('.custom-file-label').html($photoName);

        // Codice javascript per recuperare le dimensioni dell'immagine
        // selezionata dall'utente
        let _URL = window.URL || window.webkitURL;
        let file, img;
        if ((file = this.files[0])) {
            img = new Image();
            img.onload = function () {
                if (this.width != this.height) {
                    $("#photoMod").addClass("is-invalid");
                    imageChosen = false;
                }
                else {
                    $("#photoMod").removeClass("is-invalid");
                    imageChosen = true;
                }
            };
            img.src = _URL.createObjectURL(file);
        }
        checkFileField($("#photoMod"), imageChosen);
    });
    $("#emailMod").keyup(function(event) {checkEmail(event, this)});
    // Questo handler serve perché se mentre si digita l'email compaiono i suggerimenti del browser
    // e si seleziona una voce con le frecce e poi si preme tab, su firefox l'evento keyup non si
    // scatena, mentre su chrome va
    $("#emailMod").focusout(function(event) {checkEmail(event, this)});
    $("#usernameMod").keyup(function(event) {checkUser(event, this)});
    $("#passwordMod").keyup(function(event) {checkPassword(event, this)});
    $("#repeatPasswordMod").keyup(function(event) {checkRepeatPassword(event, this);});
    $("#bioMod").keyup(function(event) {checkBio(event, this, maxLengthBio)});

    $("#buttonMod").click(validateModify);

    // $("#SU").submit(function () {
    //     $("#buttonSU").attr("disabled", true);
    //     return true;
    // });
});


/**
 * Premendo il bottone di modifica si controlla che i campi siano stati correttamente compilati
 *
 * @param event event L'evento di submit, il quale mi serve perché se i campi non risultano correttamente
 *        compilati allora l'utente non deve poter procedere alla pagina successiva
 */
function validateModify(event) {
    // Di default disabilito il submit della form, che effettuo solo dopo
    // che sia i controlli lato client che lato server sono stati superati
    event.preventDefault();
    $("#formMod").removeClass('is-invalid');

    let nextPage = true;

    // Controllo lato client sui campi della form
    // nextPage &= checkFileField($("#photoMod"), imageChosen);
    nextPage &= checkEmail(event, $("#emailMod"));
    nextPage &= checkUser(event, $("#usernameMod"));
    nextPage &= checkPassword(event, $("#passwordMod"));
    nextPage &= checkRepeatPassword(event, $("#repeatPasswordMod"));
    nextPage &= checkBio(event, $("#bioMod"), maxLengthBio);
    nextPage &= checkFileField($("#photoMod"), imageChosen);


    // Se i controlli lato client hanno successo, prima di procedere alla pagina successiva devo
    // controllare che le credenziali non siano già presenti nel db
    if(nextPage) {
        // Disabilito il bottone di submit per evitare che la form sia trasmessa più di una volta
        $("#buttonMod").attr("disabled", true);
        // Ho dovuto aggiungere questa parte perché Laravel usa dei token nella form per proteggere
        // l'utente da determinati tipi di attacco

        $.ajaxSetup({
            headers: {
                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
            }
        });
        // MODIFICA IN MODO TALE DA FARE IL CONTROLLO
        let $emailChanged = $("#emailMod").val() != $("#originalEmailMod").val();
        let $usernameChanged = $("#usernameMod").val() != $("#originalUsernameMod").val();
        if ($emailChanged || $usernameChanged) {
            let $emailToSend = $emailChanged ? $("#emailMod").val() : '';
            let $usernameToSend = $usernameChanged ? $("#usernameMod").val() : '';
            $.post("/checkNewModifiedUserCredentials",
                {
                    username: $usernameToSend,
                    email: $emailToSend
                }, function (data, status, xhr) {
                    if (data.result) {
                        $('#modModal').modal({
                            keyboard: false
                        });
                        $("#mod").submit();
                    }
                    else {
                        $("#formModI").addClass("is-invalid");
                        // Se i dati inseriti erano sbagliati allora riabilito il bottone di submit
                        $("#buttonMod").attr("disabled", false);
                    }
                }, "json");
        }
        else {
            $('#modModal').modal({
                keyboard: false
            });
            $("#mod").submit();
        }
    }

}


/**
 *  Funzione che controlla che nel campo email della form sia stato inserito una email corretta.
 *  In particolare viene controllato che l'input sia della forma:
 *  testo@testo.testo
 * @param email, il valore del campo email, che viene verificato
 * @returns {boolean} true se il valore è valido, false altrimenti
 */
function checkEmail(event, email){
    const emailRegex = /\S+@\S+\.\S+/;

    if (($(email).val().length == 0 || $(email).val().length > maxLength || !$(email).val().match(emailRegex))
        && ((event!= null && event.keyCode != 9) || (event!= null && event.keyCode == 9 && $(email).val().length != 0)  || event == null)) {
        $(email).addClass("is-invalid");
        return false;
    }
    else {
        $(email).removeClass("is-invalid");
        return true;
    }
}


/**
 *  Funzione che controlla che nel campo username della form sia stato inserito un valore corretto,
 *  cioé una combinazione di lettere e numeri
 * @param user, il valore del campo user, che viene verificato
 * @returns {boolean} true se il valore è valido, false altrimenti
 */
function checkUser(event, user) {

    const userRegex = /^[a-zA-Z0-9]+$/;

    if (($(user).val().length == 0 || $(user).val().length > maxLength || !$(user).val().match(userRegex))
        && ((event!= null && event.keyCode != 9) || (event!= null && event.keyCode == 9 && $(user).val().length != 0)  || event == null)) {
        $(user).addClass("is-invalid");
        return false;
    }
    else {
        $(user).removeClass("is-invalid");
        return true;
    }
}

/**
 *  Funzione che controlla che nel campo password della form sia stato inserito un valore corretto,
 *  cioé una combinazione di almeno 8 caratteri, contenenti almeno una lettera minuscola, una lettera
 *  maiuscola, un numero e un carattere speciale
 * @param pwd, il valore del campo password, che viene verificato
 * @returns {boolean} true se il valore è valido, false altrimenti
 */
function checkPassword(event, pwd) {
    //cifra   //minuscola //maiuscola //simbolo //almeno 8 dei caratteri che accetto
    const passwordRegex = /^(?=.*[\d])(?=.*[A-Z])(?=.*[a-z])(?=.*[\W_])[\x21-\x7E]{8,}$/;

    if (($(pwd).val().length == 0 || $(pwd).val().length > maxLength || !$(pwd).val().match(passwordRegex))
        && ((event!= null && event.keyCode != 9) || (event!= null && event.keyCode == 9 && $(pwd).val().length != 0) || event == null)) {
        $(pwd).addClass("is-invalid");
        return false;
    }
    else {
        $(pwd).removeClass("is-invalid");
        return true;
    }
}

/**
 * Funzione che controlla che nel campo repeatPassword sia stato inserito un valore uguale a quello nel campo password
 * @param repwd, il valore del campo repeatPassword, che viene verificato
 * @returns {boolean}, true se il valore è valido, false altrimenti
 */
function checkRepeatPassword(event, repwd) {
    if (($(repwd).val().length == 0 || $(repwd).val().length > maxLength || $(repwd).val() != $("#passwordMod").val())
        && ((event!= null && event.keyCode != 9) || (event!= null && event.keyCode == 9 && $(repwd).val().length != 0)  || event == null)) {
        $(repwd).addClass("is-invalid");
        return false;
    }
    else {
        $(repwd).removeClass("is-invalid");
        return true;
    }
}

/**
 *  Funzione che controlla che nel campo bio della form sia stato inserito un valore corretto.
 *  In particolare viene controllato che l'input non superi una certa lunghezza
 * @param bio, il valore del campo bio, che viene verificato
 * @returns {boolean} true se il valore è valido, false altrimenti
 */
function checkBio(event, bio, maxLenghtBio) {
    if (($(bio).val().length > maxLengthBio)
        && ((event!= null && event.keyCode != 9) || (event!= null && event.keyCode == 9 && $(user).val().length != 0)  || event == null)) {
        $(bio).addClass("is-invalid");
        return false;
    }
    else {
        $(bio).removeClass("is-invalid");
        return true;
    }
}

function checkFileField(field, choosed) {
    if(!choosed)
        field.addClass("is-invalid");
    else
        field.removeClass("is-invalid");

    return choosed;
}

/**
 * Funzione che mi consente di ottenere il nome del file selezionato
 * con il chooser di cui è specificato l'id
 * @param element Chooser di cui voglio ottenere il nome del file
 * @returns {string | *} La stringa che rappresenta il nome del file
 *          selezionato dall'utente tramite il chooser
 */
function getChooserName(element){
    // Ottengo il nome del file
    let fileName = element.val();
    let lastSlash = fileName.lastIndexOf("\\");
    fileName = fileName.substring(lastSlash  + 1);

    return fileName;
}